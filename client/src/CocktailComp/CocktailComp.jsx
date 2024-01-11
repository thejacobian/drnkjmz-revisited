import React, { useEffect, useState } from "react";

// findCocktailImage from ext API call to TheCocktailDB
export async function findCocktailImage(cId) {
  if (cId) {
    try {
      const searchURL = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${cId}`;
      const result = await fetch(searchURL);
      const parsedResult = await result.json();
      return parsedResult.drinks[0].strDrinkThumb;
    } catch(err) {
      console.log(`${err} in the cocktailDB ext API call`);
    }
  } else {
    console.log('cId undefined for fetching img');
  }
}

const CocktailComp = (props) => {
  const [imageUrl, setImageUrl] = useState(props.cocktailImg);

  useEffect(() => {
    async function getImage() {
      setImageUrl(await findCocktailImage(props.cocktailId));
    }
    if (!imageUrl && props.cocktailId) {
      getImage();
    }
  }, [imageUrl, props.cocktailId]);

  return (
    <div className="App">
      <div className="main-wrapper">
        <div className="cocktail__side">
          <h6 className="cocktail__directions">{props.cocktailDirections.replace("GlassServe:", "Suggested Glassware:")}</h6>
        </div>
        <div className="cocktail__img">
          <img src={imageUrl} alt="cocktailImg" />
        </div>
      </div>
    </div>
  );
}

export default CocktailComp;
