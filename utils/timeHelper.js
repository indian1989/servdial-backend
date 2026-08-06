export const normalizeTime = (time) => {

  if (!time) return time;


  time = time.trim()
  .toUpperCase();


  // 12:00 AM → 00:00
  if (time === "12:00 AM") {
    return "00:00";
  }


  // 12:00 PM → 12:00
  if (time === "12:00 PM") {
    return "12:00";
  }


  const match =
  time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);


  if(match){

    let hour = Number(match[1]);
    const minute = match[2];
    const period = match[3];


    if(period==="PM" && hour!==12){
      hour += 12;
    }


    if(period==="AM" && hour===12){
      hour = 0;
    }


    return `${String(hour).padStart(2,"0")}:${minute}`;

  }


  return time;

};