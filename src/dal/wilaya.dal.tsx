import {prisma} from "../../prisma/lib/prisma";

export async function getAllWilayas(){
    let wilayas;
    try {
             wilayas = prisma.wilaya.findMany();

    } catch (error) {
        console.error('cant fetch wilayas', error);
    }
   return wilayas;

}