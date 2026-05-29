// This handles the left sidebar search feed panel, displaying user names and message previews.

"use client";


interface SupplierChatListProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conversations: any[];
  activeId: string | null;
  onSelectChat: (id: string) => void;
}

export default function SupplierChatList({
  conversations,
  activeId,
  onSelectChat,
}: SupplierChatListProps) {
  return (
    <div className="flex-1 min-h-0  overflow-y-auto p-2 space-y-1">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelectChat(conv.id)}
          className={`w-full p-3 text-left rounded-xl transition-all border flex flex-col gap-1.5 ${
            conv.id === activeId
              ? "bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-100"
              : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-sm">
              <div className="relative">
                {conv.buyer?.image ? (
                  <img
                    src={conv.buyer.image}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                    {(conv.buyer?.name || "M")[0].toUpperCase()}
                  </div>
                )}

                {conv.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                  </span>
                )}
              </div>

              <span>{conv.buyer?.name || "Mteja wa Nimboya"}</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {conv.messages.length > 0 &&
                new Date(
                  conv.messages[conv.messages.length - 1].createdAt
                ).toLocaleDateString([], {
                  month: "short",
                  day: "numeric",
                })}
            </span>
          </div>
          <div className="text-xs text-slate-500 font-medium truncate max-w-full">
            {conv.Inquiry?.[0]?.product?.name
              ? `📦 ${conv.Inquiry[0].product.name}`
              : conv.Product?.name
                ? `📦 ${conv.Product.name}`
                : "Mjadala mkuu..."}
          </div>
          <p className="text-xs text-slate-400 truncate italic">
            {conv.messages[conv.messages.length - 1]?.content ||
              "Hakuna ujumbe uliotumwa bado..."}
          </p>
        </button>
      ))}
    </div>
  );
}
