import type { OfficeKey } from "./election";

/**
 * Explicação neutra de cada cargo, com base na Constituição Federal (CF).
 * Os dois senadores têm o mesmo papel, por isso compartilham o texto.
 */
export type OfficeInfo = {
  title: string;
  term: string;
  role: string;
  powers: string[];
  example: string;
  notRole: string;
  source: string;
};

export type OfficeInfoKey = Exclude<OfficeKey, "SENADOR_1" | "SENADOR_2"> | "SENADOR";

export function officeInfoKey(key: OfficeKey): OfficeInfoKey {
  return key === "SENADOR_1" || key === "SENADOR_2" ? "SENADOR" : key;
}

export const OFFICE_INFO: Record<OfficeInfoKey, OfficeInfo> = {
  DEPUTADO_FEDERAL: {
    title: "Deputado Federal",
    term: "Mandato de 4 anos. São 513 deputados na Câmara dos Deputados, em Brasília.",
    role: "Representa a população do seu estado no Congresso Nacional. Cria, altera e vota as leis que valem para o país inteiro.",
    powers: [
      "Propor e votar leis federais e mudanças na Constituição.",
      "Votar o Orçamento da União junto com o Senado e indicar emendas que mandam recursos para cidades e estados.",
      "Fiscalizar o governo federal e criar CPIs (Comissões Parlamentares de Inquérito).",
      "Autorizar a abertura de processo de impeachment contra o presidente (são necessários 2/3 dos votos).",
    ],
    example:
      "Em 2023, a Câmara aprovou a Reforma Tributária (Emenda Constitucional nº 132), que troca cinco tributos sobre o consumo (PIS, Cofins, IPI, ICMS e ISS) por novos impostos (CBS e IBS). Cada deputado federal votou a favor ou contra.",
    notRole:
      "Não constrói obras nem administra hospitais ou escolas. Quem executa é o governo (federal, estadual ou municipal).",
    source: "CF, arts. 45, 48, 51, 58 e 166",
  },
  DEPUTADO_ESTADUAL: {
    title: "Deputado Estadual / Distrital",
    term: "Mandato de 4 anos. Atua na Assembleia Legislativa do estado (no DF, na Câmara Legislativa, como deputado distrital).",
    role: "Cria e vota as leis que valem só para o seu estado e fiscaliza o governador.",
    powers: [
      "Propor e votar leis estaduais (no DF, também leis que em outros lugares seriam municipais).",
      "Votar o orçamento do estado e propor emendas a ele.",
      "Fiscalizar o governo estadual, criar CPIs e julgar as contas do governador.",
      "Votar a abertura de processo de impeachment contra o governador.",
    ],
    example:
      "Todo ano, a Assembleia Legislativa vota a Lei Orçamentária Anual do estado, que define quanto o governo estadual pode gastar com segurança pública, hospitais estaduais e ensino médio. Os deputados podem apresentar emendas e mudar esses valores.",
    notRole: "Não faz leis federais e não administra o estado. Quem administra é o governador.",
    source: "CF, arts. 27 e 32",
  },
  SENADOR: {
    title: "Senador",
    term: "Mandato de 8 anos. São 3 senadores por estado e pelo DF (81 no total). Em 2026 são eleitos 2 por estado, por isso você vota em dois.",
    role: "Representa o seu estado no Congresso Nacional. Revisa e vota as leis federais junto com a Câmara e tem algumas funções exclusivas.",
    powers: [
      "Propor, revisar e votar leis federais e mudanças na Constituição.",
      "Aprovar ou rejeitar indicados a cargos importantes: ministros do STF, procurador-geral da República, presidente e diretores do Banco Central e embaixadores.",
      "Julgar o presidente da República em processo de impeachment.",
      "Autorizar empréstimos externos feitos pela União, por estados e por municípios.",
    ],
    example:
      "Todo ministro do Supremo Tribunal Federal (STF) indicado pelo presidente passa por uma sabatina na Comissão de Constituição e Justiça do Senado. Ele só assume o cargo se for aprovado pela maioria absoluta do plenário (pelo menos 41 dos 81 senadores).",
    notRole: "Não administra o estado que representa nem executa obras.",
    source: "CF, arts. 46, 48, 52 e 101",
  },
  GOVERNADOR: {
    title: "Governador",
    term: "Mandato de 4 anos, com direito a uma reeleição seguida. É eleito com um vice-governador.",
    role: "Chefe do Poder Executivo do estado. Administra os serviços estaduais e coloca em prática as leis e o orçamento do estado.",
    powers: [
      "Comandar a segurança pública: Polícia Militar, Polícia Civil e Corpo de Bombeiros.",
      "Administrar a rede estadual de ensino (principalmente o ensino médio), os hospitais estaduais e as rodovias estaduais.",
      "Nomear secretários de estado e propor o orçamento estadual.",
      "Sancionar ou vetar as leis aprovadas pela Assembleia Legislativa.",
    ],
    example:
      "O governador escolhe o secretário de Segurança Pública e os comandantes das polícias. Também decide, dentro do orçamento, abrir concurso para contratar mais policiais ou professores da rede estadual.",
    notRole:
      "Não cria leis sozinho (depende da Assembleia Legislativa). Serviços como coleta de lixo e postos de saúde de bairro costumam ser responsabilidade da prefeitura.",
    source: "CF, arts. 28, 144 e 211",
  },
  PRESIDENTE: {
    title: "Presidente da República",
    term: "Mandato de 4 anos, com direito a uma reeleição seguida. É eleito com um vice-presidente.",
    role: "Chefe de Estado e de governo do Brasil. Comanda o Poder Executivo federal e representa o país no exterior.",
    powers: [
      "Nomear e demitir os ministros e dirigir a administração federal.",
      "Sancionar ou vetar leis aprovadas pelo Congresso e editar medidas provisórias.",
      "Enviar ao Congresso a proposta de Orçamento da União.",
      "Comandar as Forças Armadas, conduzir a política externa e indicar ministros do STF (que dependem da aprovação do Senado).",
    ],
    example:
      "Todo ano, até 31 de agosto, o presidente envia ao Congresso a proposta de Orçamento da União para o ano seguinte. Ela define quanto dinheiro vai para áreas como saúde (SUS), educação, previdência e segurança. Depois, deputados e senadores votam e podem alterar essa proposta.",
    notRole:
      "Não aprova leis sozinho. Uma medida provisória perde a validade se o Congresso não a aprovar em até 120 dias (sem contar o recesso parlamentar).",
    source: "CF, arts. 62, 76, 82, 84 e ADCT art. 35",
  },
};

export const OFFICE_INFO_ORDER: OfficeInfoKey[] = [
  "DEPUTADO_FEDERAL",
  "DEPUTADO_ESTADUAL",
  "SENADOR",
  "GOVERNADOR",
  "PRESIDENTE",
];
