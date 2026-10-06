import db from "./database";


export function saveMessage(
role:string,
message:string
){

db.prepare(`

INSERT INTO conversations(role,message)

VALUES(?,?)

`).run(
role,
message
);

}



export function getHistory(){

return db.prepare(`

SELECT role,message

FROM conversations

ORDER BY id DESC

LIMIT 20

`).all();

}