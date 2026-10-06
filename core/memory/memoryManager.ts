import db from "./database";



export function saveMemory(
category:string,
key:string,
value:string,
importance:number = 1
){

const stmt = db.prepare(`

INSERT INTO memories
(category,key,value,importance)

VALUES(?,?,?,?)

ON CONFLICT(key)

DO UPDATE SET

value=excluded.value,
importance=excluded.importance

`);


stmt.run(
category,
key,
value,
importance
);

}





export function searchMemory(
keyword:string
){

return db.prepare(`

SELECT *

FROM memories

WHERE key LIKE ?

OR value LIKE ?

ORDER BY importance DESC

`).all(
`%${keyword}%`,
`%${keyword}%`
);

}





export function deleteMemory(
key:string
){

db.prepare(`

DELETE FROM memories

WHERE key=?

`).run(key);

}





export function getImportantMemories(){

return db.prepare(`

SELECT *

FROM memories

ORDER BY importance DESC

LIMIT 10

`).all();

}