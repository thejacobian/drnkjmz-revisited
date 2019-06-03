/* eslint-disable jsx-a11y/anchor-is-valid */
import React from "react";

const PlayerComp = (props) => {

  const backgroundStyles = {
      backgroundImage:`url(${props.nowPlaying.album.images[0].url})`,
  };

  // const progressBarStyles = {
  //   width: (props.progress_ms * 100 / props.nowPlaying.duration_ms) + '%'
  // };

  return (
    <div className="App">
      <div className="main-wrapper">
        <div className="now-playing__img">
          <img src={props.nowPlaying.album.images[0].url} alt="albumArt" />
        </div>
        <div className="now-playing__side">
          <div className="now-playing__name">Song: {props.nowPlaying.name}</div>
          <div className="now-playing__artist">
            Artist: {props.nowPlaying.artists[0].name}
          </div><br/>
          <div className="now-playing__status">
            Status: {props.is_playing ? `Playing` : `Paused`}
          </div>
          {/* <div className="now-playing__status">
            Status: {props.is_playing ? `on ${props.currDeviceId}` : `on ${props.currDeviceId}`}
          </div> */}
          {/* <div className="progress">
            <div className="progress__bar" style={progressBarStyles} />
          </div> */}
        </div>
        <div className="now-playing__controls">
          {/* <button className="btn btn--loginApp-link" onClick={props.pauseTrack.bind(null)}>PAUSE</button><br/><br/><br/>
          <button className="btn btn--loginApp-link" onClick={props.playTrack.bind(null)}>PLAY</button><br/><br/><br/> */}
        </div>
        <div className="background" style={backgroundStyles} />{" "}
      </div>
    </div>
  );
}

export default PlayerComp;
