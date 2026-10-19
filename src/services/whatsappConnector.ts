import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import pino from 'pino';

export type WhatsAppMode = 'qr_testing' | 'meta_production';

export class WhatsAppConnector {
  private mode: WhatsAppMode = 'qr_testing';
  private sock: WASocket | null = null;
  private currentQrDataUrl: string | null = null;
  private isConnected: boolean = false;
  private authDir: string;
  private onMessageCallback?: (from: string, text: string) => Promise<string | void>;

  constructor() {
    this.authDir = path.resolve(process.cwd(), 'data', 'baileys_auth');
    if (!fs.existsSync(this.authDir)) {
      fs.mkdirSync(this.authDir, { recursive: true });
    }
  }

  public getMode(): WhatsAppMode {
    return this.mode;
  }

  public getStatus() {
    return {
      mode: this.mode,
      isConnected: this.isConnected,
      hasQr: !!this.currentQrDataUrl,
      qrDataUrl: this.currentQrDataUrl
    };
  }

  public setOnMessage(callback: (from: string, text: string) => Promise<string | void>) {
    this.onMessageCallback = callback;
  }

  /**
   * Cambia el modo de operación entre Pruebas (QR) y Producción (Meta)
   */
  public async setMode(newMode: WhatsAppMode): Promise<{ mode: WhatsAppMode; message: string }> {
    this.mode = newMode;
    console.log(`🔄 Cambiando modo de WhatsApp a: ${newMode}`);

    if (newMode === 'meta_production') {
      // Detener socket de Baileys si estaba activo
      if (this.sock) {
        try {
          this.sock.end(undefined);
        } catch (e) {}
        this.sock = null;
      }
      this.isConnected = false;
      this.currentQrDataUrl = null;
      return {
        mode: this.mode,
        message: 'Modo Producción (Meta Cloud API Webhook) activado. Escucha en /webhook.'
      };
    } else {
      // Modo Pruebas QR: inicializar Baileys
      await this.initBaileys();
      return {
        mode: this.mode,
        message: 'Modo Pruebas (Código QR Baileys) activado. Escanea el código en el panel.'
      };
    }
  }

  /**
   * Inicializa la conexión de WhatsApp Web mediante Baileys
   */
  public async initBaileys(): Promise<void> {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(this.authDir);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }) as any,
        browser: ['Dental AI Agent', 'Chrome', '1.0.0']
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.currentQrDataUrl = await QRCode.toDataURL(qr);
          console.log('📷 Nuevo código QR generado para vinculación de WhatsApp');
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;
          this.isConnected = false;
          this.currentQrDataUrl = null;
          console.log('⚠️ Conexión cerrada. ¿Reconectar?:', shouldReconnect);

          if (shouldReconnect && this.mode === 'qr_testing') {
            setTimeout(() => this.initBaileys(), 5000);
          }
        } else if (connection === 'open') {
          this.isConnected = true;
          this.currentQrDataUrl = null;
          console.log('✅ WhatsApp conectado exitosamente en modo Pruebas (QR)');
        }
      });

      // Escuchar mensajes entrantes
      this.sock.ev.on('messages.upsert', async (m) => {
        if (this.mode !== 'qr_testing') return;

        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
          const from = msg.key.remoteJid;
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

          if (from && text && this.onMessageCallback) {
            console.log(`📩 [WhatsApp QR] Mensaje de ${from}: "${text}"`);
            const reply = await this.onMessageCallback(from, text);
            if (reply && this.sock) {
              await this.sock.sendMessage(from, { text: reply });
              console.log(`🤖 [WhatsApp QR] Respuesta enviada a ${from}`);
            }
          }
        }
      });
    } catch (error) {
      console.error('Error al inicializar Baileys:', error);
    }
  }

  /**
   * Cierra sesión y borra credenciales locales para forzar un nuevo QR
   */
  public async disconnectAndReset(): Promise<void> {
    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch (e) {}
      this.sock = null;
    }
    this.isConnected = false;
    this.currentQrDataUrl = null;

    if (fs.existsSync(this.authDir)) {
      fs.rmSync(this.authDir, { recursive: true, force: true });
      fs.mkdirSync(this.authDir, { recursive: true });
    }

    if (this.mode === 'qr_testing') {
      await this.initBaileys();
    }
  }
}
