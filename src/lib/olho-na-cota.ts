/**
 * Link para o candidato no Olho na Cota (https://olhonacota.com).
 *
 * - Deputado federal da legislatura atual (tem ID da Câmara, o mesmo de
 *   https://www.camara.leg.br/deputados/{ID}): perfil direto,
 *   https://olhonacota.com/deputado/{ID}.
 * - Candidato a senador sem ID da Câmara: busca de senadores,
 *   https://olhonacota.com/senadores?busca=humberto+costa.
 * - Demais: busca de deputados, https://olhonacota.com/deputados?busca=robinson+faria.
 */
export function olhoNaCotaUrl({
  name,
  camaraId,
  senate,
}: {
  name: string;
  camaraId?: string;
  /** Candidato a senador. */
  senate?: boolean;
}) {
  if (camaraId) return `https://olhonacota.com/deputado/${camaraId}`;
  // Mesmo formato da busca do site: minúsculas e "+" no lugar dos espaços.
  const query = encodeURIComponent(name.trim().toLowerCase()).replace(/%20/g, "+");
  return `https://olhonacota.com/${senate ? "senadores" : "deputados"}?busca=${query}`;
}
