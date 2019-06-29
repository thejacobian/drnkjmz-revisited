/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { Component } from "react";

class PlayerComp extends Component{
  constructor(){
    super();
    this.state = {
      deviceId: "",
    }
  }

  handleChange = (e) => {
    e.preventDefault();
    this.setState({
      [e.target.name]: e.target.value
    }, ()=>{
      this.props.playOnDevice(this.state.deviceId);
    })
  }
  
  render () {
    const backgroundStyles = {
      backgroundImage:`url(${this.props.nowPlaying.album.images[0].url})`,
    };

    let progressBarStyles = {
      width: (this.props.progress_ms * 100 / this.props.nowPlaying.duration_ms) + '%'
    };

    return (
      <div className="App">
        <div className="main-wrapper">
          <div className="now-playing__img">
            <img src={this.props.nowPlaying.album.images[0].url} alt="albumArt" />
          </div>
          <div className="now-playing__side">
            <div className="now-playing__name">Song: {this.props.nowPlaying.name}</div>
            <div className="now-playing__artist">
              Artist: {this.props.nowPlaying.artists[0].name}
            </div>
            <div className="now-playing__device-select">
              Select a playback device:
              <select onChange={this.handleChange} name="deviceId">
                {this.props.devices.map((device, index) => {
                  return(
                    <option key={index} value={device.id}>{device.name}</option>
                  )}
                )}
              </select>
            </div><br/>
            <div className="now-playing__status">
              Status: {this.props.isPlaying ? `Playing` : `Paused`}
              {this.props.currDeviceName ? ` on ${this.props.currDeviceName}` : ''}
            </div>
            <div className="progress">
              <div className="progress__bar" style={progressBarStyles} />
            </div>
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
}

export default PlayerComp;
