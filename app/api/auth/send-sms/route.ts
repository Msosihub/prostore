// import { NextResponse } from "next/server";

// export async function POST(req: Request) {
//   try {
//     const { to, message } = await req.json();

//     if (!to || !message) {
//       return NextResponse.json(
//         { error: "Missing to or message" },
//         { status: 400 }
//       );
//     }

//     const response = await sendSms(to, message);

//     return NextResponse.json({ success: true, response });
//   } catch (error: any) {
//     console.error("SMS error:", error);
//     return NextResponse.json(
//       { success: false, error: error.message },
//       { status: 500 }
//     );
//   }
// }
