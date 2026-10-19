import { CLINIC_KNOWLEDGE_BASE } from '../knowledge/clinicData.js';
import { CalendarService } from '../services/calendarService.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class AgentOrchestrator {
  private calendar: CalendarService;

  constructor() {
    this.calendar = new CalendarService();
  }

  /**
   * Genera el System Prompt contextualizado para la clínica odontológica
   */
  private getSystemPrompt(): string {
    return `
Eres "Sofía", la asistente virtual y coordinadora de citas experta de "${CLINIC_KNOWLEDGE_BASE.nombreClinica}" en Medellín (El Poblado).
Tu objetivo es brindar una atención cálida, profesional y empática, resolver dudas sobre tratamientos dentales modernos y coordinar/agendar citas de valoración directamente para el equipo de especialistas.

INFORMACIÓN DE LA CLÍNICA:
- Ubicación: ${CLINIC_KNOWLEDGE_BASE.ubicacion}
- Horarios: ${CLINIC_KNOWLEDGE_BASE.horariosAtencion}
- Ventajas competitivas: Alta tecnología 3D, manufactura propia con certificación médica (ahorro >50% frente a multinacionales), entregas exprés (48-72 hrs) y enfoque en pacientes locales y turismo dental (USA/Canadá/Europa).

TRATAMIENTOS PRINCIPALES:
${CLINIC_KNOWLEDGE_BASE.tratamientos.map(t => `- ${t.nombre}: ${t.descripcion} (Inversión aprox: ${t.precioAproximadoCop} / ${t.precioUsd})`).join('\n')}

PAUTAS DE COMPORTAMIENTO:
1. IDIOMA Y TURISMO DENTAL: Si el usuario escribe en inglés o menciona que viaja a Medellín, responde fluidamente en inglés adaptando los tiempos de estadía y precios en USD. Si escribe en español, mantén un tono profesional, cercano y antioqueño formal.
2. AGENDAMIENTO: Para agendar una cita necesitas:
   - Nombre completo del paciente.
   - Tratamiento o motivo de consulta.
   - Fecha y hora preferida.
   - Número de contacto WhatsApp.
3. PREGUNTAS CLÍNICAS Complejas: Da orientación general preventiva, pero recuerda que el diagnóstico definitivo lo realiza el especialista tras el escaneo 3D en la clínica.
4. LLAMADO A LA ACCIÓN (CTA): Termina tus respuestas guiando al paciente a dar el siguiente paso (ej: coordinar su horario de valoración o resolver su duda principal).
    `.trim();
  }

  /**
   * Procesa el mensaje recibido de WhatsApp y decide la respuesta o acción
   */
  async processIncomingMessage(params: {
    fromPhone: string;
    text: string;
    history?: ChatMessage[];
  }): Promise<{ replyText: string; actionExecuted?: string }> {
    const { fromPhone, text, history = [] } = params;
    const lowerText = text.toLowerCase();

    // 1. Detección rápida de solicitud de horarios / disponibilidad
    if (lowerText.includes('horario') || lowerText.includes('disponib') || lowerText.includes('cuando tienen cita') || lowerText.includes('available')) {
      const today = new Date().toISOString().split('T')[0];
      const slots = await this.calendar.getAvailableSlots(today);
      const slotsFormatted = slots.map(s => s.split('T')[1].substring(0, 5)).join(', ');
      
      const isEnglish = lowerText.includes('available') || lowerText.includes('appointment');
      if (isEnglish) {
        return {
          replyText: `Hello! For our digital consultation at ${CLINIC_KNOWLEDGE_BASE.nombreClinica}, we currently have these upcoming slots: ${slotsFormatted}. What time works best for you, and could you please share your full name?`,
          actionExecuted: 'query_calendar_slots'
        };
      }

      return {
        replyText: `¡Hola! Con mucho gusto. Para valoración en ${CLINIC_KNOWLEDGE_BASE.nombreClinica} contamos con los siguientes horarios próximos: ${slotsFormatted}.\n\n¿Cuál de estos te queda mejor y me regalas tu nombre completo para reservarte el espacio?`,
        actionExecuted: 'query_calendar_slots'
      };
    }

    // 2. Detección de confirmación de cita (ej. "confirmar", "agendar", "mi nombre es ...")
    if ((lowerText.includes('confirmo') || lowerText.includes('agendar') || lowerText.includes('reserva')) && lowerText.includes(':')) {
      // Intento básico de agendamiento
      const result = await this.calendar.bookAppointment({
        patientName: 'Paciente WhatsApp',
        patientPhone: fromPhone,
        treatment: 'Valoración Digital General',
        dateTimeIso: new Date(Date.now() + 86400000).toISOString()
      });

      return {
        replyText: `¡Excelente! Hemos apartado tu cita preliminar en el sistema. ${result.details}\n\nTe esperamos en nuestra sede de El Poblado. Te enviaremos un recordatorio 24 horas antes por este mismo medio.`,
        actionExecuted: 'booked_appointment'
      };
    }

    // 3. Respuesta estructurada del Agente Asistente Inteligente
    if (lowerText.includes('alineador') || lowerText.includes('invisalign') || lowerText.includes('ortodoncia') || lowerText.includes('precio')) {
      return {
        replyText: `¡Hola! En ${CLINIC_KNOWLEDGE_BASE.nombreClinica} trabajamos con alineadores invisibles de tecnología digital 3D (láminas alemanas Taglus/Zendura de grado médico). \n\n🎯 Ventajas: Son imperceptibles, cómodos y al ser producidos localmente en Medellín ahorras más del 50% frente a sistemas multinacionales importados (tratamientos desde $1.800.000 COP).\n\n¿Te gustaría que agendemos tu escaneo intraoral 3D para evaluar tu caso esta semana?`
      };
    }

    if (lowerText.includes('implante') || lowerText.includes('cirugia') || lowerText.includes('guia')) {
      return {
        replyText: `¡Hola! Realizamos implantes dentales mediante Cirugía Guiada por Computadora (fusión 3D de tomografía y escaneo). Esto permite una colocación precisa, sin cortes innecesarios y con una recuperación mucho más rápida.\n\n¿Cuentas con alguna radiografía o tomografía reciente, o prefieres agendar una cita de valoración presencial?`
      };
    }

    // Saludo general / Bienvenida
    return {
      replyText: `¡Hola! Bienvenido/a a ${CLINIC_KNOWLEDGE_BASE.nombreClinica}. Soy Sofía, tu asesora dental virtual.\n\nTe puedo ayudar con:\n1️⃣ Información y precios de Alineadores Invisibles\n2️⃣ Implantes con Cirugía Guiada 3D\n3️⃣ Agendar tu cita de valoración en El Poblado\n4️⃣ Información de turismo dental si vienes del exterior\n\n¿En qué podemos ayudarte hoy?`
    };
  }
}
