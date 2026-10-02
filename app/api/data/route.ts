import { getDataset } from '@/lib/market';
export async function GET(){return Response.json(await getDataset(),{headers:{'Cache-Control':'private, no-store'}});}
