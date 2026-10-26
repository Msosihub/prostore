"use server";
import * as chat from "@/lib/market-chat";
export async function startMarketThread(productId: string) {
  return chat.safeChat(() => chat.startThread(productId));
}
export async function listMarketThreads(
  side: "buyer" | "seller",
  before?: string,
) {
  return chat.safeChat(() => chat.listThreads(side, before));
}
export async function loadMarketThread(id: string, before?: string) {
  return chat.safeChat(() => chat.loadThread(id, before));
}
export async function sendMarketMessage(
  input: Parameters<typeof chat.sendMessage>[0],
) {
  return chat.safeChat(() => chat.sendMessage(input));
}
export async function markMarketSeen(
  input: Parameters<typeof chat.markSeen>[0],
) {
  return chat.safeChat(() => chat.markSeen(input));
}
export async function createMarketProposal(
  input: Parameters<typeof chat.propose>[0],
) {
  return chat.safeChat(() => chat.propose(input));
}
export async function reviewMarketProposal(id: string) {
  return chat.safeChat(() => chat.reviewProposal(id));
}
export async function acceptMarketProposal(
  input: Parameters<typeof chat.acceptProposal>[0],
) {
  return chat.safeChat(() => chat.acceptProposal(input));
}
export async function cancelMarketProposal(id: string) {
  return chat.safeChat(() => chat.cancelProposal(id));
}
