



import {faker} from "@faker-js/faker"


export const sidingsData ={

    Code:faker.string.alpha({length:6}).toLocaleLowerCase(),
    Description:faker.person.jobDescriptor(),
    Active:true
}






