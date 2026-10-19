import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { AgentOrchestrator } from './agent/orchestrator.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const agent = new AgentOrchestrator();

app.use(express.json());

// Endpoint de salud
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'online',
    service: 'Dental AI Agent - WhatsApp Scheduling',
    timestamp: new Date().toISOString()
  });
});

// Verificación del Webhook de Meta Cloud API
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

// Recepción de mensajes desde WhatsApp Cloud API
app.post('/webhook', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    // Verificar si es un evento de WhatsApp
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];

      if (message && message.type === 'text') {
        const fromPhone = message.from;
        const textBody = message.text.body;

        console.log(`📩 Mensaje recibido de ${fromPhone}: "${textBody}"`);

        // Procesar con el agente inteligente
        const result = await agent.processIncomingMessage({
          fromPhone,
          text: textBody
        });

        console.log(`🤖 Respuesta generada: "${result.replyText}"`);

        // En un entorno productivo con Meta API configurada:
        // await sendWhatsAppMessage(fromPhone, result.replyText);
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
  console.log(`🔗 Endpoint de prueba local: POST http://localhost:${port}/api/chat/simulate`);
});
