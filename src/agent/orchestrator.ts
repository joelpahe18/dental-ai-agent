import { CLINIC_KNOWLEDGE_BASE } from '../knowledge/clinicData.js';
import { CalendarService } from '../services/calendarService.js';
import { KnowledgeManager } from '../services/knowledgeManager.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AgentOrchestrator {
  private calendar: CalendarService;
  public knowledge: KnowledgeManager;

  constructor() {
    this.calendar = new CalendarService();
    this.knowledge = new KnowledgeManager();
  }

  /**
   * Procesa el mensaje recibido de WhatsApp y decide la respuesta o acción
   */
  async processIncomingMessage(params: {
    fromPhone: string;
    text: string;
    history?: ChatMessage[];
  }): Promise<{ replyText: string; actionExecuted?: string; retrievedSources?: string[] }> {
    const { fromPhone, text } = params;
    const cleanText = text.trim();
    const lowerText = cleanText.toLowerCase();

    // -------------------------------------------------------------
    // 1. MANEJO EXCLUSIVO DE SELECCIÓN DE NÚMEROS (1, 2, 3, 4, 5, etc.)
    // -------------------------------------------------------------
    const isMenuSelection = (num: string, keywords: string[]) => {
      return (
        cleanText === num ||
        lowerText === `opcion ${num}` ||
        lowerText === `opción ${num}` ||
        lowerText === `numero ${num}` ||
        lowerText === `número ${num}` ||
        keywords.some(k => lowerText === k)
      );
    };

    if (isMenuSelection('1', ['alineadores', 'alineador', 'ortodoncia invisible', 'invisalign'])) {
      return {
        replyText: `✨ *Opción 1: Alineadores Invisibles (Ortodoncia 3D)*\n\nEn Clínica Dental Digital Medellín fabricamos alineadores transparentes de grado médico con tecnología 3D (láminas Taglus / Zendura).\n\n• *Ahorro:* Más del 50% frente a marcas multinacionales tradicionales.\n• *Inversión:* Planificación 3D y Setup desde $160.000 COP. Tratamientos completos desde $1.800.000 COP.\n• *Ventajas:* Totalmente estéticos, removibles y cómodos.\n\n¿Te gustaría ver horarios para agendar tu escaneo intraoral 3D de valoración?`,
        actionExecuted: 'option_aligners'
      };
    }

    if (isMenuSelection('2', ['implantes', 'implante', 'cirugia guiada', 'cirugía guiada'])) {
      return {
        replyText: `🦷 *Opción 2: Implantes con Cirugía Guiada 3D*\n\nRealizamos la colocación de implantes mediante planificación computarizada fusionando tomografía CBCT y escaneo intraoral.\n\n• *Precisión:* Férula quirúrgica milimétrica que evita incisiones a mano alzada.\n• *Beneficios:* 70% menos dolor e inflamación postoperatoria, cicatrización acelerada y menor tiempo en el sillón.\n• *Inversión:* Guías quirúrgicas de precisión desde $180.000 COP.\n\n¿Cuentas con tomografía previa o deseas agendar tu cita de valoración presencial?`,
        actionExecuted: 'option_implants'
      };
    }

    if (isMenuSelection('3', ['cuidados', 'protocolos', 'protocolo'])) {
      return {
        replyText: `📋 *Opción 3: Cuidados y Protocolos Clínicos*\n\nContamos con protocolos especializados para:\n• Cuidados postoperatorios de implantes y extracciones (hielo, gasas, dieta blanda).\n• Higiene y mantenimiento de alineadores invisibles.\n• Uso y limpieza de placas de bruxismo.\n\n¿Sobre qué procedimiento en particular necesitas consultar las recomendaciones?`,
        actionExecuted: 'option_protocols'
      };
    }

    if (isMenuSelection('4', ['agendar', 'cita', 'citas', 'horario', 'horarios', 'disponibilidad'])) {
      const today = new Date().toISOString().split('T')[0];
      const slots = await this.calendar.getAvailableSlots(today);
      const slotsFormatted = slots.map(s => s.split('T')[1].substring(0, 5)).join(', ');

      return {
        replyText: `📅 *Opción 4: Agendamiento de Citas*\n\nCon mucho gusto. Para valoración en nuestra sede de El Poblado (Cra 43A # 1-50, Torre Médica) tenemos los siguientes horarios próximos disponibles:\n\n👉 *${slotsFormatted}*\n\nPor favor indícanos:\n1. ¿Cuál hora te queda mejor?\n2. ¿Tu nombre completo para apartar el espacio?`,
        actionExecuted: 'query_calendar_slots'
      };
    }

    if (isMenuSelection('5', ['turismo', 'turismo dental', 'viaje', 'exterior'])) {
      return {
        replyText: `✈️ *Opción 5: Turismo Dental y Pacientes Internacionales*\n\n¡Bienvenido a Medellín! Somos especialistas en coordinar tratamientos express para pacientes del exterior (USA, Canadá y Europa):\n\n• *Ahorro:* Entre el 60% y 70% comparado con precios en Norteamérica o Europa.\n• *Tiempos:* Entregas de alineadores o cirugía guiada en 3 a 5 días hábiles.\n• *Ubicación:* Sector exclusivo de El Poblado con convenios hoteleros.\n\nWe also provide full English assistance. Would you like to schedule an assessment or receive a personalized plan?`,
        actionExecuted: 'option_tourism'
      };
    }

    // -------------------------------------------------------------
    // 2. BÚSQUEDA EN BASE DE CONOCIMIENTO (RAG & FAQs)
    // -------------------------------------------------------------
    const relevantChunks = this.knowledge.searchRelevantChunks(cleanText, 2);
    const retrievedSources = relevantChunks.map(c => c.sourceFile);

    if (relevantChunks.length > 0) {
      const chunkContext = relevantChunks.map(c => c.content).join('\n\n');
      return {
        replyText: `💡 *Información encontrada en nuestros protocolos clínicos:*\n\n${chunkContext}\n\n¿Te gustaría agendar una valoración o consultar algo adicional?`,
        actionExecuted: 'rag_retrieval',
        retrievedSources
      };
    }

    // -------------------------------------------------------------
    // 3. MENÚ PRINCIPAL DE BIENVENIDA (Fallback)
    // -------------------------------------------------------------
    return {
      replyText: `¡Hola! Bienvenido/a a Clínica Dental Digital Medellín. Soy Sofía, tu asesora dental virtual.\n\nEscribe el *número* o la opción que deseas consultar:\n\n1️⃣ Información y precios de Alineadores Invisibles\n2️⃣ Implantes con Cirugía Guiada 3D\n3️⃣ Cuidados y protocolos clínicos\n4️⃣ Agendar tu cita de valoración en El Poblado\n5️⃣ Información de turismo dental si vienes del exterior\n\n¿En qué podemos ayudarte hoy?`,
      retrievedSources: []
    };
  }
}
