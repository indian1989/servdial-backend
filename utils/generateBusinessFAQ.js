const formatBusinessHours = (businessHours) => {

  if (!businessHours) return "";

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  const formatted = [];

  days.forEach((day) => {

    const data = businessHours[day];

    if (!data) return;


    if (data.closed) {

      formatted.push(
        `${day}: Closed`
      );

    } else if (data.open && data.close) {

      formatted.push(
        `${day}: ${data.open} - ${data.close}`
      );

    }

  });


  return formatted.join(", ");

};





const generateBusinessFAQ = ({
  business,
  language = "en"
}) => {


  const faq = [];



  const name =
    business?.name || "";



  const city =
    business?.cityId?.name ||
    business?.cityName ||
    "";



  const category =
    business?.categoryId?.name ||
    business?.categoryName ||
    "";



  const state =
    business?.state ||
    "";



  const address =
    business?.address || "";



  const services =
    business?.services
      ?.map(item => item.name)
      .filter(Boolean) || [];



  const description =
    business?.description || "";



  const phone =
    business?.phone || "";



  const whatsapp =
    business?.whatsapp || "";



  const hours =
    formatBusinessHours(
      business?.businessHours
    );




  const addFAQ = (
    question,
    answer
  ) => {

    if(question && answer){

      faq.push({
        question,
        answer
      });

    }

  };





  // ==========================
  // HINDI
  // ==========================

  if(language === "hi"){


    if(category && city){

      addFAQ(

        `क्या ${name} ${city} में ${category} service प्रदान करता है?`,

        `हाँ, ${name} ${city}, ${state} में ${category} services प्रदान करता है।`

      );

    }



    if(services.length){

      addFAQ(

        `${name} कौन-कौन सी services प्रदान करता है?`,

        `${name} ${services.join(", ")} services प्रदान करता है।`

      );

    }



    if(address){

      addFAQ(

        `${name} का address क्या है?`,

        `${name} ${address} पर स्थित है।`

      );

    }



    if(phone){

      addFAQ(

        `${name} से संपर्क कैसे करें?`,

        `आप ${name} से ${phone} पर संपर्क कर सकते हैं।`

      );

    }



    if(whatsapp){

      addFAQ(

        `क्या ${name} WhatsApp पर उपलब्ध है?`,

        `हाँ, आप ${name} से WhatsApp नंबर ${whatsapp} पर संपर्क कर सकते हैं।`

      );

    }



    if(hours){

      addFAQ(

        `${name} का opening timing क्या है?`,

        `${name} का business timing ${hours} है।`

      );

    }



    if(description){

      addFAQ(

        `${name} के बारे में जानकारी क्या है?`,

        description

      );

    }


  }





  // ==========================
  // ENGLISH DEFAULT
  // ==========================

  else {


    if(category && city){

      addFAQ(

        `Does ${name} provide ${category} services in ${city}?`,

        `Yes, ${name} provides ${category} services in ${city}, ${state}.`

      );

    }



    if(services.length){

      addFAQ(

        `What services does ${name} provide?`,

        `${name} provides ${services.join(", ")} services.`

      );

    }



    if(address){

      addFAQ(

        `What is the address of ${name}?`,

        `${name} is located at ${address}.`

      );

    }



    if(phone){

      addFAQ(

        `How can I contact ${name}?`,

        `You can contact ${name} at ${phone}.`

      );

    }



    if(whatsapp){

      addFAQ(

        `Can I contact ${name} on WhatsApp?`,

        `Yes, ${name} is available on WhatsApp at ${whatsapp}.`

      );

    }



    if(hours){

      addFAQ(

        `What are the opening hours of ${name}?`,

        `${name} is available during ${hours}.`

      );

    }



    if(description){

      addFAQ(

        `What does ${name} specialize in?`,

        description

      );

    }


  }




  return faq;

};


export default generateBusinessFAQ;