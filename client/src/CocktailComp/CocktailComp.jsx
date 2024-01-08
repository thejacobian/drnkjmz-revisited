/* eslint-disable jsx-a11y/anchor-is-valid */
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

  // const backgroundStyles = {
  //     backgroundImage:`url(${props.nowPlaying.album.images[0].url})`,
  //     // width: '45%'
  // };

  return (
    <div className="App">
      <div className="main-wrapper">
        <div className="cocktail__side">
          {/* <p className="cocktail-name">A Day at the Beach</p> */}
          <h6 className="cocktail__directions">{props.cocktailDirections}</h6>
        </div>
        <div className="cocktail__img">
          <img src={imageUrl} alt="cocktailImg" />
        </div>
          {/* <button className="btn" onClick={props.pauseTrack.bind(null)}>PAUSE</button><br/><br/><br/>
          <button className="btn" onClick={props.playTrack.bind(null)}>PLAY</button><br/><br/><br/> */}
        {/* <div className="background" style={backgroundStyles} />{" "} */}
      </div>
    </div>
  );
}

export default CocktailComp;
