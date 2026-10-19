import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { AgentOrchestrator } from './agent/orchestrator.js';
import { WhatsAppConnector, WhatsAppMode } from './services/whatsappConnector.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3015;

const agent = new AgentOrchestrator();
const waConnector = new WhatsAppConnector();

// Configurar el callback de mensajes para cuando lleguen por Baileys (QR)
waConnector.setOnMessage(async (fromJid, text) => {
  const cleanPhone = fromJid.split('@')[0];
  const result = await agent.processIncomingMessage({
    fromPhone: cleanPhone,
    text
  });
  return result.replyText;
});

// Inicializar el modo inicial (por defecto Pruebas QR)
waConnector.setMode('qr_testing').catch(console.error);

app.use(express.json());
app.use(express.static(path.resolve(process.cwd(), 'public')));

// Endpoint de salud
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Dental AI Agent - WhatsApp Scheduling & RAG',
    whatsappMode: waConnector.getMode(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.resolve(process.cwd(), 'public', 'admin.html'));
});

// ==========================================
// CONTROL DE MODO WHATSAPP (PRUEBAS VS PRODUCCIÓN)
// ==========================================

app.get('/api/whatsapp/status', (req: Request, res: Response) => {
  res.json(waConnector.getStatus());
});

app.post('/api/whatsapp/mode', async (req: Request, res: Response) => {
  const { mode } = req.body as { mode: WhatsAppMode };
  if (mode !== 'qr_testing' && mode !== 'meta_production') {
    res.status(400).json({ error: 'Modo inválido. Usar qr_testing o meta_production' });
    return;
  }
  const result = await waConnector.setMode(mode);
  res.json(result);
});

app.post('/api/whatsapp/reset', async (req: Request, res: Response) => {
  await waConnector.disconnectAndReset();
  res.json({ success: true, message: 'Sesión de WhatsApp cerrada. Generando nuevo código QR.' });
});

// ==========================================
// API DE BASE DE CONOCIMIENTO (RAG)
// ==========================================

app.get('/api/knowledge/documents', (req: Request, res: Response) => {
  const docs = agent.knowledge.listDocuments();
  res.json(docs);
});

app.post('/api/knowledge/documents', (req: Request, res: Response) => {
  const { fileName, content } = req.body;
  if (!fileName || !content) {
    res.status(400).json({ error: 'fileName y content son obligatorios' });
    return;
  }

  agent.knowledge.saveDocument(fileName, content);
  res.json({ success: true, message: `Documento ${fileName} guardado e indexado con éxito.` });
});

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
// MODO PRODUCCIÓN: WEBHOOK META CLOUD API
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

    if (waConnector.getMode() !== 'meta_production') {
      console.log('ℹ️ Webhook de Meta recibido, pero el sistema está en modo Pruebas (QR). Ignorando.');
      res.sendStatus(200);
      return;
    }

    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === 'text') {
        const fromPhone = message.from;
        const textBody = message.text.body;

        console.log(`📩 [Meta API] Mensaje de ${fromPhone}: "${textBody}"`);

        const result = await agent.processIncomingMessage({
          fromPhone,
          text: textBody
        });

        console.log(`🤖 [Meta API] Respuesta: "${result.replyText}"`);
        // Aquí se despacha por axios/fetch a https://graph.facebook.com/v21.0/... si están las credenciales
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
  console.log(`📊 Panel web administrativo disponible en: http://localhost:${port}/`);
});
