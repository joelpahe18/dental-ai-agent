export interface ClinicFAQ {
  pregunta: string;
  respuesta: string;
  categoria: 'ortodoncia' | 'implantes' | 'bruxismo' | 'turismo' | 'general';
}

export interface DentalTreatment {
  nombre: string;
  duracionMinutos: number;
  precioAproximadoCop: string;
  precioUsd: string;
  descripcion: string;
  requisitosPrevios: string;
}

export const CLINIC_KNOWLEDGE_BASE = {
  nombreClinica: "Clínica Dental Digital Medellín",
  ubicacion: "Sector El Poblado, Milla de Oro, Medellín, Colombia",
  horariosAtencion: "Lunes a Viernes de 8:00 AM a 6:00 PM. Sábados de 8:00 AM a 1:00 PM.",
  
  especialidades: [
    "Ortodoncia Digital con Alineadores Invisibles (Marca Blanca)",
    "Implantología Oral y Cirugía Guiada por Computadora (Fusión CBCT + STL)",
    "Placas Miorrelajantes y Tratamiento de Bruxismo",
    "Estética Dental y Diseño de Sonrisa",
    "Turismo Médico y Dental para Pacientes Internacionales"
  ],

  tratamientos: [
    {
      nombre: "Valoración de Ortodoncia Invisible (Alineadores)",
      duracionMinutos: 45,
      precioAproximadoCop: "Planificación 3D y Setup: $160.000 COP. Tratamientos completos desde $1.800.000 COP.",
      precioUsd: "From $450 - $900 USD",
      descripcion: "Escaneo intraoral digital sin pastas molestas, simulación 3D inmediata de movimientos y fabricación rápida con láminas Taglus/Zendura.",
      requisitosPrevios: "Ninguno para valoración inicial."
    },
    {
      nombre: "Valoración Implantología y Cirugía Guiada",
      duracionMinutos: 45,
      precioAproximadoCop: "Guías quirúrgicas de precisión desde $180.000 COP + Implante según valoración.",
      precioUsd: "From $400 - $800 USD per implant",
      descripcion: "Colocación guiada milimétrica con mínima invasión, menos dolor, postoperatorio rápido y sin bisturí extenso.",
      requisitosPrevios: "Si cuenta con Tomografía CBCT reciente, traerla o enviarla digitalmente."
    },
    {
      nombre: "Placa Miorrelajante Digital (Bruxismo)",
      duracionMinutos: 30,
      precioAproximadoCop: "$250.000 - $350.000 COP",
      precioUsd: "$70 - $100 USD",
      descripcion: "Férula anatómica impresa en resina biocompatible certificada para protección dental y alivio articular.",
      requisitosPrevios: "Limpieza básica previa recomendada."
    }
  ],

  faqs: [
    {
      categoria: "turismo",
      pregunta: "How long do I need to stay in Medellín for aligners or implants?",
      respuesta: "For digital aligners or smile assessments, a stay of 3 to 5 business days is enough to complete digital scans, 3D setup, and deliver your initial kits. For implants with surgical guides, 5 to 7 days is ideal. We coordinate fast delivery within 48-72 hours."
    },
    {
      categoria: "ortodoncia",
      pregunta: "¿Por qué sus alineadores son más accesibles que marcas tradicionales como Invisalign?",
      respuesta: "Fabricamos localmente en Medellín con tecnología 3D de resolución 12K y láminas de grado médico certificadas internacionalmente (Taglus/Zendura), eliminando aranceles, intermediarios y comisiones corporativas del exterior. La calidad biomecánica es idéntica con un ahorro de más del 50%."
    },
    {
      categoria: "general",
      pregunta: "¿Dónde están ubicados?",
      respuesta: "Estamos ubicados en El Poblado, Medellín, en una zona médica exclusiva con fácil acceso, parqueadero y convenios hoteleros para pacientes del exterior."
    }
  ]
};
