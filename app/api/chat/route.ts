


import { NextResponse } from "next/server";
import { askGemini } from "@/core/gemini";

function allowedOrigins() {
  return (process.env.BUMBLEBEE_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || allowedOrigins().includes(origin);
}

function corsHeaders(request: Request) {
  const headers = new Headers();
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins().includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Vary", "Origin");
  }
  return headers;
}

function jsonResponse(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders(request) });
}

export async function OPTIONS(request: Request) {
  if (!isAllowedOrigin(request)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(req:Request){

try{
if (!isAllowedOrigin(req)) {
  return jsonResponse(req, { error: "This web origin is not allowed. Configure BUMBLEBEE_ALLOWED_ORIGINS on the API host." }, 403);
}
const body: unknown = await req.json();
const message =
  typeof body === "object" &&
  body !== null &&
  "message" in body &&
  typeof body.message === "string"
    ? body.message.trim()
    : "";

if (!message) {
  return jsonResponse(req, { error: "Please enter a message." }, 400);
}

const reply = await askGemini(message);
return jsonResponse(req, { reply });
}
catch(error){
  console.error("BUMBLEBEE REQUEST ERROR:", error);
  const message = error instanceof Error ? error.message : "The AI service request failed.";
  return jsonResponse(req, { error: message }, 500);
}
}



/*import { NextResponse } from "next/server";
import { think } from "@/core/brain";


export async function POST(req:Request){

try{

const {message}=await req.json();


const reply =
await think(message);


return NextResponse.json({
reply
});


}
catch(error:any){

console.error(
"BUMBLEBEE REQUEST ERROR:",
error
);


return NextResponse.json(
{
error:error.message
},
{
status:500
}
);

}

}
*/


/*//import { askGemini } from "@/core/gemini";
import {NextResponse} from "next/server";
import {think} from "@/core/brain";


export async function POST(
req:Request
){

try{

const {
message
}=await req.json();


const reply =
await think(message);


return NextResponse.json({
reply
});


}

catch(error:any){

console.error(
"BUMBLEBEE REQUEST ERROR",
error
);


return NextResponse.json(
{
error:error.message
},
{
status:500
}
);

}

}
*/