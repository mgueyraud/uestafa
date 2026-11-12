import type { Lang } from "./i18n";

/*
 * The case in brief, for the info dialog: what happened, who is involved and
 * what savers can do. Every claim comes from the sources listed at the end.
 */
type Line = { lead?: string; text: string };

export type Info = {
  open: string;
  close: string;
  updated: string;
  title: string;
  lede: string;
  figures: { value: string; label: string }[];
  timeline: {
    heading: string;
    days: { date: string; lead?: string; text: string }[];
  };
  why: { heading: string; paragraphs: string[] };
  people: {
    heading: string;
    list: {
      name: string;
      role: string;
      status: string;
      held: boolean;
      text: string;
    }[];
    note: Line;
  };
  money: {
    heading: string;
    sub: string;
    rows: { amount: string; text: string }[];
    cta: string;
    note: string;
  };
  response: { heading: string; list: Line[] };
  unknown: { heading: string; list: string[] };
  sources: string;
  footer: string;
};

export const BCP_PAYMENTS = "https://www.bcp.gov.py/fgd-pagos";

const es: Info = {
  open: "Qué pasó con ueno bank",
  close: "Cerrar",
  updated: "Actualizado: 11 nov 2026",
  title: "Qué pasó con ueno bank",
  lede: "El banco con más clientes del Paraguay cerró de un día para otro. En una semana cayeron sus directivos, el presidente del Banco Central y el presidente de la República. Este resumen reúne los hechos confirmados y enlaza cada fuente.",
  figures: [
    { value: "2,94 M", label: "clientes, más del 60% de los adultos del país" },
    {
      value: "US$ 2.800 M",
      label: "en depósitos congelados el 3 de noviembre",
    },
    {
      value: "27%",
      label: "de esos depósitos alcanza a cubrir el fondo de garantía",
    },
    { value: "44 a 0", label: "votó el Senado para destituir a Santiago Peña" },
  ],
  timeline: {
    heading: "Los hechos, día por día",
    days: [
      {
        date: "Oct",
        text: "El Banco Central (BCP) abre un sumario a ueno por exceso en los límites de préstamos. A fin de mes, el banco anuncia un plan de capitalización de US$ 100 millones.",
      },
      {
        date: "2 nov",
        lead: "El directorio del BCP vota por unanimidad la resolución del banco.",
        text: "Su índice de solvencia estaba por debajo de la mitad del mínimo legal.",
      },
      {
        date: "3 nov",
        text: "Se anuncia la medida. Dejan de funcionar la app, las tarjetas y las sucursales. Renuncia Carlos Carvallo, presidente del BCP. Ocho directivos quedan detenidos. Ahorristas y jubilados protestan frente al Panteón de los Héroes.",
      },
      {
        date: "4 nov",
        text: "Se promulga la Ley 7755/26, que permite adelantar pagos del Fondo de Garantía de Depósitos. La oposición presenta el pedido de juicio político.",
      },
      {
        date: "5 nov",
        lead: "Santiago Peña presenta su renuncia.",
        text: "Un juez ordena prisión preventiva para Miguel Vázquez, Juan Manuel Gustale y otros seis ejecutivos. El BCP empieza a pagar a los ahorristas.",
      },
      {
        date: "6 nov",
        lead: "El Senado destituye a Peña con los 44 votos presentes.",
        text: "Pedro Alliana jura como presidente. Esa noche, Peña queda detenido en su casa.",
      },
      {
        date: "7 nov",
        text: "Un juez ordena la prisión preventiva de Peña en el Regimiento de Escolta Presidencial.",
      },
      {
        date: "9 nov",
        text: "La Fiscalía allana las viviendas de Peña y de Carvallo, y una sede de ueno.",
      },
      {
        date: "10 nov",
        text: "El BCP informa que el 93,1% de los clientes con depósitos cubiertos ya cobró: unos US$ 340 millones.",
      },
    ],
  },
  why: {
    heading: "Por qué cayó",
    paragraphs: [
      "Según la investigación, ueno habría prestado dinero a empresas de su propio grupo económico por encima de los límites legales. Cuando el BCP ajustó los balances, el capital no alcanzaba ni la mitad de lo exigido.",
      "El caso es también político. Cerca del 29% de los depósitos era dinero público, sobre todo del Instituto de Previsión Social (IPS). Peña fue socio de Grupo Vázquez, dueño del banco, hasta marzo de 2025. Y Carvallo dirigió la financiera ueno antes de presidir el BCP, el organismo que debía supervisarla.",
    ],
  },
  people: {
    heading: "Quiénes están involucrados",
    list: [
      {
        name: "Miguel Vázquez Villasanti",
        role: "CEO de ueno y principal accionista de Grupo Vázquez",
        status: "Prisión preventiva",
        held: true,
        text: "Imputado. Días antes del cierre decía a sus empleados que al banco no le iba a pasar nada.",
      },
      {
        name: "Juan Manuel Gustale",
        role: "Presidente de ueno bank",
        status: "Prisión preventiva",
        held: true,
        text: "Imputado junto a otros seis ejecutivos con la misma medida. Dos directivas más tienen arresto domiciliario.",
      },
      {
        name: "Santiago Peña",
        role: "Presidente de la República hasta el 6 de noviembre",
        status: "Destituido · Prisión preventiva",
        held: true,
        text: "Imputado por presunta lesión de confianza y administración en provecho propio. Se declaró inocente.",
      },
      {
        name: "Carlos Carvallo",
        role: "Presidente del BCP hasta el 3 de noviembre",
        status: "Renunció · Prisión preventiva",
        held: true,
        text: "Imputado. El BCP sostiene que se apartó de las decisiones sobre ueno.",
      },
      {
        name: "Pedro Alliana",
        role: "Vicepresidente de Peña",
        status: "Presidente hasta 2028",
        held: false,
        text: "Ordenó acciones inmediatas para los afectados y renueva el gabinete. Parte de los manifestantes no lo reconoce.",
      },
    ],
    note: {
      lead: "Imputado no es condenado.",
      text: "Ninguna de estas personas tiene sentencia. La justicia todavía debe probar los hechos.",
    },
  },
  money: {
    heading: "Tu plata",
    sub: "Lo que el Fondo de Garantía de Depósitos (FGD) cubre y lo que no.",
    rows: [
      {
        amount: "≤ G. 10.000.000",
        text: "Cobrás todo. El primer grupo pagado fue el de quienes no tenían deudas con ueno y ya tenían cuenta en otro banco.",
      },
      {
        amount: "≤ G. 228.300.000",
        text: "Es el tope de la garantía: 75 salarios mínimos por persona. Los certificados de depósito de ahorro (CDA) están incluidos.",
      },
      {
        amount: "Por encima del tope",
        text: "Hay que esperar la liquidación del banco. El BCP adelantó que entre los saldos no cubiertos cobra primero el IPS.",
      },
      {
        amount: "Jubilados",
        text: "El IPS asigna automáticamente otro banco a quienes cobraban por ueno.",
      },
    ],
    cta: "Consultar mi pago en el BCP",
    note: "El BCP informa solo por sus canales oficiales. No pide claves ni datos por WhatsApp o redes.",
  },
  response: {
    heading: "Cómo responde la gente",
    list: [
      {
        lead: "En la calle.",
        text: "Concentraciones en el microcentro de Asunción y frente a la sede de ueno, donde se quemaron tarjetas de crédito y débito.",
      },
      {
        lead: "Con comida.",
        text: "Pequeños locales ofrecen platos gratis a quienes quedaron sin acceso a su dinero. Influencers reparten panchos y hamburguesas a los manifestantes.",
      },
      {
        lead: "Con plazos.",
        text: "Comercios y gimnasios extienden vencimientos a clientes afectados y abren vacantes para extrabajadores del grupo.",
      },
      {
        lead: "Con oficio.",
        text: "Estudiantes de Medicina atienden gratis y otros universitarios juntan víveres y dan asesoría profesional.",
      },
    ],
  },
  unknown: {
    heading: "Lo que todavía no se sabe",
    list: [
      "Cuánto recuperarán quienes tenían más que el tope de la garantía.",
      "Cuánto del dinero del IPS y de las cajas jubilatorias vuelve, y cuándo.",
      "Qué pasará con los puestos de trabajo perdidos: entre 6.000 y 7.000, según la fuente.",
      "Si las imputaciones terminan en juicio y condena.",
    ],
  },
  sources: "Fuentes",
  footer:
    "Página ciudadana e independiente. No pertenece al BCP, a ueno bank ni a ningún partido. Los hechos cambian rápido: ante cualquier duda sobre tu dinero, vale lo que publique el BCP.",
};

const en: Info = {
  open: "What happened to ueno bank",
  close: "Close",
  updated: "Updated: Nov 11, 2026",
  title: "What happened to ueno bank",
  lede: "Paraguay's most widely used bank shut down overnight. Within a week its executives, the head of the Central Bank and the country's president had all fallen. This summary gathers the confirmed facts and links every source.",
  figures: [
    { value: "2.94 M", label: "clients, over 60% of the country's adults" },
    { value: "US$ 2,800 M", label: "in deposits frozen on Nov 3" },
    {
      value: "27%",
      label: "of those deposits is what the guarantee fund can cover",
    },
    { value: "44 to 0", label: "was the Senate vote to remove Santiago Peña" },
  ],
  timeline: {
    heading: "The facts, day by day",
    days: [
      {
        date: "Oct",
        text: "The Central Bank (BCP) opens proceedings against ueno for exceeding lending limits. At month's end the bank announces a US$ 100 million capitalization plan.",
      },
      {
        date: "Nov 2",
        lead: "The BCP board votes unanimously to put the bank into resolution.",
        text: "Its solvency ratio was under half the legal minimum.",
      },
      {
        date: "Nov 3",
        text: "The decision is announced. The app, cards and branches stop working. BCP president Carlos Carvallo resigns. Eight executives are detained. Savers and retirees protest at the Panteón de los Héroes.",
      },
      {
        date: "Nov 4",
        text: "Law 7755/26 is enacted, allowing advance payouts from the Deposit Guarantee Fund. The opposition files for impeachment.",
      },
      {
        date: "Nov 5",
        lead: "Santiago Peña submits his resignation.",
        text: "A judge orders pretrial detention for Miguel Vázquez, Juan Manuel Gustale and six other executives. The BCP starts paying savers.",
      },
      {
        date: "Nov 6",
        lead: "The Senate removes Peña with all 44 votes present.",
        text: "Pedro Alliana is sworn in as president. That night Peña is detained at his home.",
      },
      {
        date: "Nov 7",
        text: "A judge orders Peña into pretrial detention at the Presidential Escort Regiment.",
      },
      {
        date: "Nov 9",
        text: "Prosecutors raid the homes of Peña and Carvallo, and a ueno office.",
      },
      {
        date: "Nov 10",
        text: "The BCP reports that 93.1% of clients with covered deposits have been paid: about US$ 340 million.",
      },
    ],
  },
  why: {
    heading: "Why it fell",
    paragraphs: [
      "According to investigators, ueno allegedly lent money to companies in its own economic group above the legal limits. Once the BCP adjusted the books, capital was below half of what the law requires.",
      "The case is political too. About 29% of deposits were public money, mostly from the social security institute (IPS). Peña was a business partner of Grupo Vázquez, the bank's owner, until March 2025. And Carvallo ran the ueno finance company before heading the BCP, the body meant to supervise it.",
    ],
  },
  people: {
    heading: "Who is involved",
    list: [
      {
        name: "Miguel Vázquez Villasanti",
        role: "ueno CEO and main shareholder of Grupo Vázquez",
        status: "Pretrial detention",
        held: true,
        text: "Charged. Days before the shutdown he was telling staff nothing would happen to the bank.",
      },
      {
        name: "Juan Manuel Gustale",
        role: "President of ueno bank",
        status: "Pretrial detention",
        held: true,
        text: "Charged along with six other executives under the same measure. Two more directors are under house arrest.",
      },
      {
        name: "Santiago Peña",
        role: "President of Paraguay until Nov 6",
        status: "Removed · Pretrial detention",
        held: true,
        text: "Charged with alleged breach of trust and administration for personal gain. He has declared himself innocent.",
      },
      {
        name: "Carlos Carvallo",
        role: "BCP president until Nov 3",
        status: "Resigned · Pretrial detention",
        held: true,
        text: "Charged. The BCP says he recused himself from decisions involving ueno.",
      },
      {
        name: "Pedro Alliana",
        role: "Peña's vice president",
        status: "President until 2028",
        held: false,
        text: "He ordered immediate action for those affected and is reshuffling the cabinet. Some protesters do not recognize him.",
      },
    ],
    note: {
      lead: "Charged is not convicted.",
      text: "None of these people has been sentenced. The courts still have to prove the facts.",
    },
  },
  money: {
    heading: "Your money",
    sub: "What the Deposit Guarantee Fund (FGD) covers and what it doesn't.",
    rows: [
      {
        amount: "≤ G. 10,000,000",
        text: "You get everything back. The first group paid had no debts with ueno and already held an account at another bank.",
      },
      {
        amount: "≤ G. 228,300,000",
        text: "This is the guarantee ceiling: 75 minimum wages per person. Savings certificates of deposit (CDA) are included.",
      },
      {
        amount: "Above the ceiling",
        text: "You must wait for the bank's liquidation. The BCP has said IPS is first in line among uncovered balances.",
      },
      {
        amount: "Retirees",
        text: "IPS automatically assigns another bank to those who were paid through ueno.",
      },
    ],
    cta: "Check my payment at the BCP",
    note: "The BCP communicates only through its official channels. It does not ask for passwords or details over WhatsApp or social media.",
  },
  response: {
    heading: "How people are responding",
    list: [
      {
        lead: "In the street.",
        text: "Rallies in downtown Asunción and outside ueno's headquarters, where people burned credit and debit cards.",
      },
      {
        lead: "With food.",
        text: "Small eateries offer free meals to people cut off from their money. Influencers hand out hot dogs and burgers to protesters.",
      },
      {
        lead: "With time.",
        text: "Shops and gyms extend due dates for affected customers and open vacancies for former group employees.",
      },
      {
        lead: "With skills.",
        text: "Medical students give free care and other students collect food and offer professional advice.",
      },
    ],
  },
  unknown: {
    heading: "What is still unknown",
    list: [
      "How much those above the guarantee ceiling will recover.",
      "How much of the IPS and pension fund money comes back, and when.",
      "What happens to the jobs lost: between 6,000 and 7,000, depending on the source.",
      "Whether the charges lead to trial and conviction.",
    ],
  },
  sources: "Sources",
  footer:
    "An independent citizen page. It does not belong to the BCP, ueno bank or any party. Facts are moving fast: for anything about your money, what the BCP publishes is what counts.",
};

export const INFO: Record<Lang, Info> = { es, en };

/** The reporting behind the summary; titles stay in the language they ran in. */
export const SOURCES: { title: string; href: string }[] = [
  {
    title: "BCP: comunicado de pagos",
    href: "https://www.bcp.gov.py/web/institucional/w/comunicado-sobre-inicio-de-pagos-de-garantia-a-los-depositantes-de-ueno-bank-sa",
  },
  {
    title: "ABC Color: todos los comunicados del BCP",
    href: "https://www.abc.com.py/economia/2026/11/04/todos-los-comunicados-del-bcp-sobre-ueno-bank/",
  },
  {
    title: "ABC Color: guía para ahorristas",
    href: "https://www.abc.com.py/economia/2026/11/09/ueno-guia-para-ahorristas-con-todo-lo-que-tenes-que-saber-para-cobrar-tu-dinero/",
  },
  {
    title: "ABC Color: primer grupo de pagos",
    href: "https://www.abc.com.py/economia/2026/11/05/atencion-clientes-de-ueno-bcp-ya-pagara-garantias-a-primer-grupo-con-depositos-hasta-g-10-millones/",
  },
  {
    title: "Infobae: las claves del caso",
    href: "https://www.infobae.com/economia/2026/11/06/una-por-una-las-claves-para-entender-el-escandalo-del-ueno-bank-en-paraguay-que-derivo-en-una-fuerte-crisis-politica/",
  },
  {
    title: "Infobae/EFE: destitución y detención",
    href: "https://www.infobae.com/america/agencias/2026/11/07/destituyen-y-luego-detienen-a-santiago-pena-en-paraguay/",
  },
  {
    title: "Infobae: allanamientos",
    href: "https://www.infobae.com/america/america-latina/2026/11/10/la-fiscalia-de-paraguay-allano-las-viviendas-de-santiago-pena-en-asuncion-por-el-escandalo-de-ueno-bank/",
  },
  {
    title: "Unitel/AFP: qué pasó con el dinero",
    href: "https://unitel.bo/noticias/agencias/que-paso-con-el-dinero-de-ueno-bank-en-paraguay-y-cuanto-falta-recuperar-GD24723674",
  },
  {
    title: "La Nación: historia del banco",
    href: "https://www.lanacion.com.ar/el-mundo/ueno-el-banco-que-crecio-a-la-velocidad-del-poder-que-construyo-pena-y-que-se-derrumbo-en-un-dia-nid05112026/",
  },
  {
    title: "Confidencial/DW: seis claves",
    href: "https://confidencial.digital/mundo/paraguay-claves-del-escandalo-bancario-que-llevo-a-la-renuncia-a-pena/",
  },
  {
    title: "Forbes: la intervención",
    href: "https://www.forbesargentina.com/today/crisis-bancaria-paraguay-intervienen-banco-mas-us-2800-millones-depositos-n101654",
  },
  {
    title: "La República: videos del CEO",
    href: "https://www.larepublica.co/globoeconomia/los-videos-del-ceo-de-ueno-bank-que-desnudan-la-crisis-del-banco-paraguayo-4519385",
  },
  {
    title: "Mundiario: pagos al 10 de noviembre",
    href: "https://www.mundiario.com/economia/prometia-devolver-40-compras-acabo-quebrando-que-paso-banco-ueno-paraguay/20261110125138452007.html",
  },
  {
    title: "Última Hora: ola solidaria",
    href: "https://www.ultimahora.com/video-ueno-fallo-pero-la-gente-no-olla-solidaria-de-influencers-estudiantes-y-ciudadanos-con-afectados",
  },
  {
    title: "ABC Color: solidaridad empresarial",
    href: "https://www.abc.com.py/nacionales/2026/11/07/la-incertidumbre-laboral-tras-el-colapso-de-ueno-bank-activa-la-solidaridad-empresarial/",
  },
  {
    title: "El Nacional: el pueblo salvando al pueblo",
    href: "https://elnacional.com.py/nacionales/el-pueblo-salvando-pueblo-solidaridad-paraguaya-medio-crisis-financiera-n114918",
  },
];
