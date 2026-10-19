import { CLINIC_KNOWLEDGE_BASE } from '../knowledge/clinicData.js';
import { CalendarService } from '../services/calendarService.js';
import { KnowledgeManager } from '../services/knowledgeManager.js';

export interface UserSession {
  stage: 'idle' | 'awaiting_time_selection' | 'awaiting_patient_name';
  treatmentOfInterest?: string;
  selectedTimeSlot?: string;
  patientName?: string;
  lastInteraction: number;
}

export class AgentOrchestrator {
  private calendar: CalendarService;
  public knowledge: KnowledgeManager;
  private sessions: Map<string, UserSession> = new Map();

  constructor() {
    this.calendar = new CalendarService();
    this.knowledge = new KnowledgeManager();
  }

  private getSession(phone: string): UserSession {
    let session = this.sessions.get(phone);
    if (!session || Date.now() - session.lastInteraction > 30 * 60 * 1000) {
      session = {
        stage: 'idle',
        lastInteraction: Date.now()
      };
      this.sessions.set(phone, session);
    }
    session.lastInteraction = Date.now();
    return session;
  }

  /**
   * Procesa el mensaje recibido de WhatsApp y gestiona el flujo conversacional con memoria
   */
  async processIncomingMessage(params: {
    fromPhone: string;
    text: string;
  }): Promise<{ replyText: string; actionExecuted?: string; retrievedSources?: string[] }> {
    const { fromPhone, text } = params;
    const cleanText = text.trim();
    const lowerText = cleanText.toLowerCase();
    const session = this.getSession(fromPhone);

    // -------------------------------------------------------------
    // FLUJO CONVERSACIONAL CON ESTADOS (MEMORIA)
    // -------------------------------------------------------------

    // Si el usuario responde afirmativamente ("sí", "claro", "me gustaría ver horarios", "dale")
    const isAffirmative = [
      'si', 'sí', 'claro', 'por favor', 'porfa', 'dale', 'de una',
      'me gustaría', 'ver horarios', 'quiero', 'yes', 'ok', 'bueno'
    ].some(w => lowerText === w || lowerText.startsWith(w + ' '));

    // Si estaba viendo información de un tratamiento y responde que sí a ver horarios:
    if (session.stage === 'idle' && isAffirmative && session.treatmentOfInterest) {
      const today = new Date().toISOString().split('T')[0];
      const slots = await this.calendar.getAvailableSlots(today);
      const slotsFormatted = slots.map(s => s.split('T')[1].substring(0, 5)).join(', ');

      session.stage = 'awaiting_time_selection';
      return {
        replyText: `📅 ¡Excelente! Para tu valoración de *${session.treatmentOfInterest}* en nuestra sede de El Poblado tenemos estos horarios disponibles:\n\n👉 *${slotsFormatted}*\n\n¿Cuál de estos horarios te queda mejor?`,
        actionExecuted: 'query_calendar_slots'
      };
    }

    // Si estamos esperando que seleccione una hora (ej: "11:00", "a las 11", "9:00", "2:30", etc.)
    if (session.stage === 'awaiting_time_selection') {
      // Detectar formato de hora o selección
      const timeMatch = cleanText.match(/\b([01]?[0-9]|2[0-3])(:[0-5][0-9])?\b/);
      if (timeMatch || lowerText.includes('mañana') || lowerText.includes('tarde') || lowerText.includes('primera')) {
        session.selectedTimeSlot = cleanText;
        session.stage = 'awaiting_patient_name';
        return {
          replyText: `Perfecto, apartaremos tu espacio a las *${cleanText}*.\n\nPor favor, ¿me indicas tu *nombre y apellido completo* para registrar la cita en el sistema?`,
          actionExecuted: 'time_slot_selected'
        };
      }
    }

    // Si estamos esperando el nombre del paciente para confirmar la cita en el calendario
    if (session.stage === 'awaiting_patient_name') {
      session.patientName = cleanText;
      const today = new Date().toISOString().split('T')[0];
      const appointmentTime = `${today}T11:00:00`; // hora estimada o asignada

      const result = await this.calendar.bookAppointment({
        patientName: session.patientName,
        patientPhone: fromPhone,
        treatment: session.treatmentOfInterest || 'Valoración Odontológica Digital',
        dateTimeIso: appointmentTime
      });

      const confirmedTreatment = session.treatmentOfInterest || 'Valoración Digital';
      const confirmedTime = session.selectedTimeSlot || 'horario seleccionado';

      // Reiniciar estado
      session.stage = 'idle';

      return {
        replyText: `✅ *¡Cita Confirmada con Éxito!*\n\n• *Paciente:* ${session.patientName}\n• *Tratamiento:* ${confirmedTreatment}\n• *Hora apartada:* ${confirmedTime}\n• *Sede:* El Poblado, Cra 43A # 1-50, Torre Médica\n\n${result.details}\n\nTe enviaremos un recordatorio 24 horas antes por este medio. ¿Tienes alguna pregunta previa a tu visita?`,
        actionExecuted: 'booked_appointment'
      };
    }

    // -------------------------------------------------------------
    // SELECCIÓN DE OPCIONES DEL MENÚ (1, 2, 3, 4, 5)
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
      session.treatmentOfInterest = 'Alineadores Invisibles (Ortodoncia 3D)';
      return {
        replyText: `✨ *Opción 1: Alineadores Invisibles (Ortodoncia 3D)*\n\nEn Clínica Dental Digital Medellín fabricamos alineadores transparentes de grado médico con tecnología 3D (láminas Taglus / Zendura).\n\n• *Ahorro:* Más del 50% frente a marcas multinacionales tradicionales.\n• *Inversión:* Planificación 3D y Setup desde $160.000 COP. Tratamientos completos desde $1.800.000 COP.\n• *Ventajas:* Totalmente estéticos, removibles y cómodos.\n\n¿Te gustaría ver horarios para agendar tu escaneo intraoral 3D de valoración? *(Responde Sí o Ver horarios)*`,
        actionExecuted: 'option_aligners'
      };
    }

    if (isMenuSelection('2', ['implantes', 'implante', 'cirugia guiada', 'cirugía guiada'])) {
      session.treatmentOfInterest = 'Implantes con Cirugía Guiada';
      return {
        replyText: `🦷 *Opción 2: Implantes con Cirugía Guiada 3D*\n\nRealizamos la colocación de implantes mediante planificación computarizada fusionando tomografía CBCT y escaneo intraoral.\n\n• *Precisión:* Férula quirúrgica milimétrica que evita incisiones a mano alzada.\n• *Beneficios:* 70% menos dolor e inflamación postoperatoria, cicatrización acelerada y menor tiempo en el sillón.\n• *Inversión:* Guías quirúrgicas de precisión desde $180.000 COP.\n\n¿Te gustaría que revisemos disponibilidad de horarios para tu valoración presencial? *(Responde Sí o Ver horarios)*`,
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

      session.stage = 'awaiting_time_selection';
      session.treatmentOfInterest = session.treatmentOfInterest || 'Valoración General';

      return {
        replyText: `📅 *Opción 4: Agendamiento de Citas*\n\nCon mucho gusto. Para valoración en nuestra sede de El Poblado (Cra 43A # 1-50, Torre Médica) tenemos los siguientes horarios próximos disponibles:\n\n👉 *${slotsFormatted}*\n\n¿Cuál hora te queda mejor?`,
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
    // BÚSQUEDA EN BASE DE CONOCIMIENTO (RAG & FAQs)
    // -------------------------------------------------------------
    const relevantChunks = this.knowledge.searchRelevantChunks(cleanText, 2);
    const retrievedSources = relevantChunks.map(c => c.sourceFile);

    if (relevantChunks.length > 0) {
      const chunkContext = relevantChunks.map(c => c.content).join('\n\n');
      return {
        replyText: `💡 *Información encontrada en nuestros protocolos clínicos:*\n\n${chunkContext}\n\n¿Te gustaría ver horarios para agendar tu cita de valoración?`,
        actionExecuted: 'rag_retrieval',
        retrievedSources
      };
    }

    // -------------------------------------------------------------
    // MENÚ PRINCIPAL (Fallback)
    // -------------------------------------------------------------
    return {
      replyText: `¡Hola! Bienvenido/a a Clínica Dental Digital Medellín. Soy Sofía, tu asesora dental virtual.\n\nEscribe el *número* o la opción que deseas consultar:\n\n1️⃣ Información y precios de Alineadores Invisibles\n2️⃣ Implantes con Cirugía Guiada 3D\n3️⃣ Cuidados y protocolos clínicos\n4️⃣ Agendar tu cita de valoración en El Poblado\n5️⃣ Información de turismo dental si vienes del exterior\n\n¿En qué podemos ayudarte hoy?`,
      retrievedSources: []
    };
  }
}
