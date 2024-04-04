import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

//make your secret
const secretKey = 'secret';
const key = new TextEncoder().encode(secretKey);

//encrypt yout dat
export async function encrypt(payload: any){
    return await new SignJWT(payload)
    .setProtectedHeader({alg: 'HS256'})
    .setIssuedAt()
    .setExpirationTime('60 seconds')
    .sign(key)
}

//decrypt your data
export async function decrypt(input: string): Promise<any> {
    const {payload} = await jwtVerify(input, key, {algorithms:['HS256'],}); 
    return payload
}

export async function login (formData: FormData){
    //verify credientials and get the user
    const user = { name: formData.get('name'),email: formData.get('email'), password: formData.get('password')};

     if(user.name !== process.env.USER_NAME ||user.email !== process.env.USER_EMAIL || user.password !== process.env.USER_PASSWORD){
        return false;
    }

    //create the seesion
    const expires = new Date(Date.now() + 100 * 1000);
    const session = await encrypt({user, expires})

    //save the session in a cookie
    cookies().set('session', session, {expires,httpOnly:true})
}

export async function logout(){
    //destroy the session 
    cookies().set('session', '', {expires: new Date(0)});
}

export async function getSession(){
    const session = cookies().get('session')?.value;
    if(!session) return null;
    return await decrypt(session);
}

export async function updateSession(request: NextRequest){
    const session = request.cookies.get('session')?.value;
    if(!session) return;

    //refresh the sesion so it doesn't expire
    const parsed = await decrypt(session);
    parsed.expires = new Date(Date.now() + 100 * 1000);
    const res = NextResponse.next();
    res.cookies.set({
        name: 'session',
        value: await encrypt(parsed),
        httpOnly: true,
        expires: parsed.expires,
    })
    return res;
}
