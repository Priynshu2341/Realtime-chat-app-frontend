import {backendApi} from "../api/axios"

export const loginApi = async ({email,password}) => {
   const response = await backendApi.post("/auth/login",{
    "email" : email,
    "password": password
   });
   return response.data;

}

export const registerApi = async ({email,password,firstname,lastname}) => {
    const response = await backendApi.post("/auth/register",{
        "email": email,
        "password" : password,
        "firstname": firstname,
        "lastname" : lastname
    });
    return response.data;
    }