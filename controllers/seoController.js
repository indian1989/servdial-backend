import City from "../models/City.js";
import Category from "../models/Category.js";

const baseUrl = "https://servdial.com";

export const generateCityCategoryPages = async (req, res) => {

  try {

    const cities = await City.find().select("slug name");
    const categories = await Category.find().select("slug name");

    let pages = [];

    cities.forEach(city => {

      categories.forEach(cat => {

        pages.push({
          city: city.slug,
          category: cat.slug,
          url: `${baseUrl}/${city.slug}/${cat.slug}`,
          title: `${cat.name} in ${city.name} | ServDial`
        });

      });

    });

    res.json({
      totalPages: pages.length,
      pages
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error generating SEO pages"
    });

  }

};