/**
 * Link para o candidato no Olho na Cota (https://olhonacota.com).
 * Com o ID da Câmara dos Deputados, vai direto ao perfil; sem ele, busca pelo nome.
 */
export function olhoNaCotaUrl({ name, camaraId }: { name: string; camaraId?: string }) {
  return camaraId
    ? `https://olhonacota.com/deputado/${camaraId}`
    : `https://olhonacota.com/deputados?busca=${encodeURIComponent(name)}`;
}
