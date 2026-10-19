import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { AgentOrchestrator } from './agent/orchestrator.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3015;
const agent = new AgentOrchestrator();

app.use(express.json());
// Servir archivos estáticos del panel web
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Endpoint de salud
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Dental AI Agent - WhatsApp Scheduling & RAG',
    timestamp: new Date().toISOString()
  });
});

// Redireccionar raíz al panel administrativo
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'public', 'admin.html'));
});

// ==========================================
// API DEL MÓDULO DE GESTIÓN DE CONOCIMIENTO
// ==========================================

// 1. Listar documentos cargados en la base de conocimiento
app.get('/api/knowledge/documents', (req: Request, res: Response) => {
  const docs = agent.knowledge.listDocuments();
  res.json(docs);
});

// 2. Guardar un nuevo documento/protocolo y re-indexar al vuelo
app.post('/api/knowledge/documents', (req: Request, res: Response) => {
  const { fileName, content } = req.body;
  if (!fileName || !content) {
    res.status(400).json({ error: 'fileName y content son obligatorios' });
    return;
  }

  agent.knowledge.saveDocument(fileName, content);
  res.json({ success: true, message: `Documento ${fileName} guardado e indexado con éxito.` });
});

// 3. Eliminar un documento de la base de conocimiento
app.delete('/api/knowledge/documents/:name', (req: Request, res: Response) => {
  const name = String(req.params.name);
  const deleted = agent.knowledge.deleteDocument(name);
  if (deleted) {
    res.json({ success: true, message: `Documento ${name} eliminado.` });
  } else {
    res.status(404).json({ error: 'Documento no encontrado' });
  }
});

// ==========================================
// WEBHOOK META WHATSAPP CLOUD API
// ==========================================

app.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || 'token_seguro_para_webhook_de_meta';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ Webhook de Meta verificado exitosamente');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === 'text') {
        const fromPhone = message.from;
        const textBody = message.text.body;

        console.log(`📩 Mensaje recibido de ${fromPhone}: "${textBody}"`);

        const result = await agent.processIncomingMessage({
          fromPhone,
          text: textBody
        });

        console.log(`🤖 Respuesta generada: "${result.replyText}"`);
      }

      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.sendStatus(500);
  }
});

// Endpoint interactivo para pruebas vía HTTP / simulador
app.post('/api/chat/simulate', async (req: Request, res: Response) => {
  const { phone = '+573001234567', message = 'Hola, quisiera información sobre los alineadores' } = req.body;
  const response = await agent.processIncomingMessage({
    fromPhone: phone,
    text: message
  });

  res.json({
    request: { phone, message },
    response
  });
});

app.listen(port, () => {
  console.log(`🚀 Dental AI Agent activo en el puerto ${port}`);
  console.log(`📊 Panel web de Base de Conocimiento disponible en: http://localhost:${port}/`);
});
