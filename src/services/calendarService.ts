import { google } from 'googleapis';

export interface TimeSlot {
  start: string;
  end: string;
}

export class CalendarService {
  private calendar: any;
  private calendarId: string;

  constructor() {
    this.calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
    
    // Si existen credenciales de Service Account configuradas, inicializamos Google Calendar
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const auth = new google.auth.JWT({
        email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/calendar']
      });
      this.calendar = google.calendar({ version: 'v3', auth });
    } else {
      console.warn('⚠️ Google Calendar credentials not provided. Using in-memory fallback for scheduling.');
    }
  }

  /**
   * Consulta disponibilidad de huecos para una fecha específica (YYYY-MM-DD)
   */
  async getAvailableSlots(dateStr: string): Promise<string[]> {
    if (!this.calendar) {
      // Retorna horarios simulados de 9:00 AM a 5:00 PM
      return [
        `${dateStr}T09:00:00`,
        `${dateStr}T11:00:00`,
        `${dateStr}T14:30:00`,
        `${dateStr}T16:00:00`
      ];
    }

    try {
      const timeMin = new Date(`${dateStr}T08:00:00-05:00`).toISOString();
      const timeMax = new Date(`${dateStr}T18:00:00-05:00`).toISOString();

      const res = await this.calendar.events.list({
        calendarId: this.calendarId,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const busyEvents = res.data.items || [];
      // Generar slots de 45 mins disponibles
      const candidateHours = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
      const available = candidateHours.filter(hour => {
        const slotStart = new Date(`${dateStr}T${hour}:00-05:00`).getTime();
        return !busyEvents.some((ev: any) => {
          const evStart = new Date(ev.start.dateTime || ev.start.date).getTime();
          const evEnd = new Date(ev.end.dateTime || ev.end.date).getTime();
          return slotStart >= evStart && slotStart < evEnd;
        });
      });

      return available.map(h => `${dateStr}T${h}:00`);
    } catch (error) {
      console.error('Error fetching calendar slots:', error);
      return [`${dateStr}T10:00:00`, `${dateStr}T15:00:00`];
    }
  }

  /**
   * Crea una cita en la agenda
   */
  async bookAppointment(params: {
    patientName: string;
    patientPhone: string;
    treatment: string;
    dateTimeIso: string;
    durationMinutes?: number;
    notes?: string;
  }): Promise<{ success: boolean; eventId?: string; details: string }> {
    const { patientName, patientPhone, treatment, dateTimeIso, durationMinutes = 45, notes = '' } = params;
    const start = new Date(dateTimeIso);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const summary = `Cita: ${patientName} - ${treatment}`;
    const description = `Paciente: ${patientName}\nTeléfono WhatsApp: ${patientPhone}\nTratamiento: ${treatment}\nNotas: ${notes}\nOrigen: Agente Dental IA (Plan Medellín)`;

    if (!this.calendar) {
      return {
        success: true,
        eventId: `simulated-${Date.now()}`,
        details: `Cita simulada agendada para ${patientName} el ${start.toLocaleString('es-CO')} para ${treatment}.`
      };
    }

    try {
      const res = await this.calendar.events.insert({
        calendarId: this.calendarId,
        requestBody: {
          summary,
          description,
          start: { dateTime: start.toISOString() },
          end: { dateTime: end.toISOString() }
        }
      });

      return {
        success: true,
        eventId: res.data.id,
        details: `Cita confirmada en Google Calendar con ID: ${res.data.id}`
      };
    } catch (error) {
      console.error('Error booking event in calendar:', error);
      return {
        success: false,
        details: 'No se pudo escribir en el calendario principal.'
      };
    }
  }
}
