/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";

const CocktailComp = (props) => {

  const backgroundStyles = {
      backgroundImage:`url(${props.nowPlaying.album.images[0].url})`,
  };

  return (
    <div className="App">
      <div className="main-wrapper">
        <div className="cocktail__side">
          {/* <p className="cocktail-name">A Day at the Beach</p> */}
          <h6 className="cocktail__directions">{props.cocktailDirections}</h6>
        </div>
        <div className="cocktail__img">
          <img src={props.cocktailImg} alt="cocktailImg" />
        </div>
          {/* <button className="btn" onClick={props.pauseTrack.bind(null)}>PAUSE</button><br/><br/><br/>
          <button className="btn" onClick={props.playTrack.bind(null)}>PLAY</button><br/><br/><br/> */}
        <div className="background" style={backgroundStyles} />{" "}
      </div>
    </div>
  );
}

export default CocktailComp;
