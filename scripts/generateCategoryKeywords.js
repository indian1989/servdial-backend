// backend/scripts/generateCategoryKeywords.js

import mongoose from "mongoose";
import dotenv from "dotenv";

import Category from "../models/Category.js";
import { generateCategoryKeywords } from "../utils/categoryKeywords.js";

dotenv.config();


const run = async () => {

  try {

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log(
      "MongoDB connected"
    );


    const categories =
      await Category.find({});


    console.log(
      `Found ${categories.length} categories`
    );


    let updated = 0;


    for (const category of categories) {

      const keywords =
        generateCategoryKeywords({
          name: category.name,
          slug: category.slug,
        });


      category.keywords =
        keywords;


      await category.save();


      updated++;


      console.log(
        `Updated: ${category.name} → ${keywords.length} keywords`
      );
    }


    console.log(
      `\nCompleted. Updated ${updated} categories.`
    );


    await mongoose.disconnect();

    process.exit(0);

  } catch (error) {

    console.error(
      "Keyword migration failed:",
      error
    );

    await mongoose.disconnect();

    process.exit(1);
  }
};


run();