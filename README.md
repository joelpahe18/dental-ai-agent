# Dental AI Agent - Agente Odontológico de Agendamiento 24/7

Sistema inteligente de atención, calificación de prospectos y agendamiento autónomo de citas para clínicas odontológicas en Medellín y Valle de Aburrá (orientado a tratamientos de alto valor: Alineadores Marca Blanca, Cirugía Guiada de Implantes y Turismo Médico).

Diseñado con base en las especificaciones del plan de negocio dental B2B (Sección 7: *Solución Tecnológica: Agente de IA para Clínicas Odontológicas*).

---

## 🚀 Características Principales

* **Atención Continuada 24/7:** Respuestas inmediatas a altas horas de la noche o fines de semana para evitar la pérdida del 40% de prospectos de pautas publicitarias.
* **Módulo Bilingüe para Turismo Dental:** Detecta procedencia internacional y adapta cotizaciones y tiempos de estancia en Medellín (El Poblado) en inglés/español.
* **Integración con Google Calendar & CRMs:** Consulta de disponibilidad en tiempo real y bloqueo directo de citas de valoración sin intermediarios humanos.
* **Mitigación de Inasistencias (No-Shows):** Estructura preparada para confirmación y recordatorios automatizados vía WhatsApp.
* **Arquitectura Privada y Segura:** Compatible con orquestación en VPS local, n8n y Meta Cloud API.

---

## 🛠️ Stack Tecnológico

* **Lenguaje:** TypeScript / Node.js
* **Framework Web:** Express
* **Integraciones:** 
  * Meta Cloud API (WhatsApp Business Platform)
  * Google Calendar API v3
  * LLM (Claude 3.5 Sonnet / OpenAI / Gemini) con RAG local
* **Tipado & Validación:** Zod, TypeScript Strict Mode

---

## 📦 Instalación y Puesta en Marcha

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/joelpahe18/dental-ai-agent.git
   cd dental-ai-agent
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   # Editar .env con tus credenciales de Meta y Google Calendar
   ```

4. Ejecutar en modo desarrollo:
   ```bash
   npm run dev
   ```

5. Compilar para producción:
   ```bash
   npm run build
   npm start
   ```

---

## 🧪 Pruebas Rápidas sin Meta API (Endpoint de Simulación)

Puedes probar la inteligencia y respuestas del agente inmediatamente con una petición POST:

```bash
curl -X POST http://localhost:3000/api/chat/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+573001234567",
    "message": "¿Qué precio tienen los alineadores invisibles y cuándo tienen disponibilidad?"
  }'
```

---

## 💼 Modelo de Negocio Asociado

* **Setup e Implementación:** $1.200.000 COP (Pago único).
* **Retainer Mensual de Soporte y Mantenimiento:** $350.000 - $600.000 COP / mes.
* **Retorno de Inversión (ROI):** La captura de un único paciente de ortodoncia invisible o implantes al mes amortiza la totalidad del costo anual de la solución.
