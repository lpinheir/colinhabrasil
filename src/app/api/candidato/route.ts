import { NextResponse, type NextRequest } from "next/server";

import { ELECTION, getOffice, isStateCode } from "@/config/election";
import { getCandidate } from "@/lib/tse";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const state = (params.get("uf") ?? "").toUpperCase();
  const office = getOffice(params.get("cargo") ?? "");
  const number = params.get("numero") ?? "";

  if (!isStateCode(state) || !office || !/^\d+$/.test(number)) {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  try {
    const candidate = await getCandidate({
      year: ELECTION.year,
      state,
      office: office.key,
      number,
    });
    if (!candidate) {
      return NextResponse.json({ found: false }, { status: 404 });
    }
    return NextResponse.json(
      { found: true, candidate },
      { headers: { "Cache-Control": "public, max-age=600, s-maxage=3600" } },
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Não foi possível consultar o TSE agora. Tente novamente." },
      { status: 502 },
    );
  }
}
