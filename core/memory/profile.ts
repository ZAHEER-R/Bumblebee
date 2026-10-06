import db from "./database";



export function setProfile(
field:string,
value:string
){

db.prepare(`

INSERT INTO user_profile
(field,value)

VALUES(?,?)

ON CONFLICT(field)

DO UPDATE SET

value=excluded.value

`).run(
field,
value
);


}




export function getProfile(){

return db.prepare(`

SELECT field,value

FROM user_profile

`).all();

}