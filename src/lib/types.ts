export type Candidate = {
  number: string;
  name: string;
  party: string;
  partyNumber: string;
  photoUrl: string;
  status?: string;
  /** ID do deputado nos Dados Abertos da Câmara, quando é deputado federal na legislatura atual. */
  camaraId?: string;
};
