import React, { Component } from "react";
import { 
  Button,
  Form,
  FormGroup,
  Input,
  Navbar,
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
 } from "reactstrap";
import PlayerComp from "./PlayerComp/PlayerComp";
import CocktailComp from "./CocktailComp/CocktailComp";
import EditCocktail from "./EditCocktail/EditCocktail";
import NewCocktail from "./NewCocktail/NewCocktail";
import "./App.css";
import SpotifyWebApi from "spotify-web-api-js";

// require('dotenv').config()

// set up connection to spotifyApi library
const spotifyApi = new SpotifyWebApi();

// spotify api connection variables (some from private .env)
const sPAuthEndpoint = 'https://accounts.spotify.com/authorize';
const sPClientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const sPRedirectUri= process.env.REACT_APP_SPOTIFY_REDIRECT_URI;
const sPScopes = [
  'user-read-private',
  'user-follow-modify',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-currently-playing',
];

// MusicStory api connection variables (some from private .env)
// const mSKey = process.env.REACT_APP_MUSICSTORY_CONSUMER_KEY;
// var mSSecret = process.env.REACT_APP_MUSICSTORY_CONSUMER_SECRET;
// var mSApi = new window.MusicStoryApi(mSKey, mSSecret);

// Helper function to get the hash of the url for spotify API comms _token
const hash = window.location.hash
  .substring(1)
  .split("&")
  .reduce(function(initial, item) {
    if (item) {
      var parts = item.split("=");
      initial[parts[0]] = decodeURIComponent(parts[1]);
    }
    return initial;
  }, {});
window.location.hash = "";

// App class and constructor initializing basic state
class App extends Component {
  constructor() {
    super();
    this.state = {
      isLoading: false,
      token: null,
      artist: "",
      cocktail: null,
      newCocktail: null,
      updatedCocktail: null,
      artistResults: null,
      response: null,
      deviceName: null,
      deviceId: "",
      allDeviceIds: null,
      nowPlaying: {
        album: {
          images: [{ url: "" }]
        },
        name: "",
        artists: [{ name: "" }],
        duration_ms:0,
      },
      isPlaying: true,
      progress_ms: 0,
      js: false,
      history: [],
      externalWindow: null,
      sPUser: null,
      curUser: null,
      newUser: null,
      updatedUser: null,
      justSynced: false,
      syncTimer: null,
    };
  }
  
  playOnDevice = async (newDeviceId) => {
    try {
      await spotifyApi.transferMyPlayback([newDeviceId]);
      // await this.setDeviceName();
      // await this.getCurrentlyPlaying();
      setTimeout(this.setDeviceName, 200);
      setTimeout(this.getCurrentlyPlaying, 200);
    } catch (err) {
      console.log(`${err} in the spotify playOnDevice ext API lib call`);
    }
  }

  // Make a call to the spotify ext API from getDeviceIds
  getDevices = async () => {
    try {
      const response = await spotifyApi.getMyDevices();
      this.setState({
        allDeviceIds: response.devices,
      });
      return response.devices;
    } catch (err) {
      console.log(`${err} in the spotify getDeviceIds ext API lib call`);
    }
  }

  // helper function to set this.state.deviceName
  setDeviceName = async () => {
    // get the user deviceIds
    const allDevices = await this.getDevices();
    let locDevice = allDevices?.filter(aDevice => aDevice.id === this.state.deviceId);
    if (!locDevice?.length && allDevices?.length) {
      locDevice = [allDevices[0]];
    }
    if (locDevice?.length) {
      this.setState ({
        deviceId: locDevice[0].id,
        deviceName: locDevice[0].name
      });
    }
  }

  // Once react page is loaded/mounted after redirect from spotify login,
  // save token in state and in spotifyApi helper library
  componentDidMount = async () => {
    // Set token from hash
    let _token = hash.access_token;

    // Set token in state if truthy/exists
    if (_token) {
      // save token in state
      this.setState({
        token: _token
      });

      // set spotifyApi to our access token to be able to make requests
      spotifyApi.setAccessToken(_token);

      // get the user private data for new User creation in backend
      await this.getMe();

      // search backend Users for logged in Spotify user for saving cocktails
      const loggedUser = await this.loginUser();
      if (!loggedUser) {
        // console.log(`No corresponding user found for Spotify user: ${this.state.sPUser.id}`);
        // create newUser in backend using sPUser data in state
        const newUser = await this.createUser();
        if (!newUser) {
          console.log ('User creation request to backend failed')
        }
      }

      // get the user deviceName
      await this.setDeviceName();

      // call getCurrentlyPlaying API request if token is good
      await this.getCurrentlyPlaying();

      if (this.state.deviceId && this.state.deviceName && this.state.nowPlaying.artists) {
        // get initial cocktail for currentlyPlaying artist on page load.
        await this.handleSubmit(null, this.state.nowPlaying.artists[0].name);

        this.setState({
          isPlaying: true,
        })
      }
    }
  }

  // componentWillUnmount() {
  //   //clear the interval when unmounting the page to avoid memory leak
  //   clearInterval(this.state.syncTimer);
  // }
  
  handleChange = (e) => {
    this.setState({
        [e.target.name]: e.target.value
    })
  }

  getNewCocktail = async (formArtist) => {
    this.setState({
      isLoading: true
    })
    // hack in case artistResults has not been found yet from Spotify API
    let cocktailGenres;
    if (this.state.artistResults)
      cocktailGenres = this.state.artistResults[0];
    else {
      cocktailGenres = {"genres":"rock"};
    }

    const response = await fetch(`${process.env.REACT_APP_BACKEND_ADDRESS}/api/v1/cocktails/search`, {
      method: "POST",
      body: JSON.stringify(cocktailGenres),
      credentials: 'include',
      headers: {
          "Content-Type": "application/json"
      }
    });

    let parsedResponse = {};
    try {
      parsedResponse = await response.json();
    } catch (err) {
      console.log(`Unable to parse response in getNewCocktail: ${err}`);
    }

    if(parsedResponse.status === 200){
      this.setState({
          isLoading: false,
          cocktail: parsedResponse,
          artist: ""
      });
    }
  }
  
  handleSubmit = async (e, formArtist) => {
    clearInterval(this.state.syncTimer);

    await this.searchArtists(formArtist);

    if (!this.state.artist || !this.state.artistResults[0]) {
      await this.playTrack("");
      document.getElementById('artist-search').value = '';
    } else {
      await this.playTrack(this.state.artistResults[0].uri);
    }

    await this.getCurrentlyPlaying();
    setTimeout(this.getCurrentlyPlaying, 200);

    await this.getNewCocktail(formArtist);
  }

  syncNewTrack = async () => {
    clearInterval(this.state.syncTimer);

    //only if it has been longer than 3 secs since last synced do we sync again
    if (!this.state.justSynced) {
      // update setDeviceName for PlayerComp to current nowPlaying device
      await this.setDeviceName();
      // sync with Spotify and getCurrentlyPlaying state
      await this.getCurrentlyPlaying();
      // console.log(this.state.nowPlaying.artists[0].name, ': nowPlaying.artist in syncNewTrack');
      // sync with Spotify and get new cocktail state
      await this.handleSubmit(null, this.state.nowPlaying.artists[0].name);

      //set flag to true indicating a syncNewTrack event just occurred
      await this.setState({
        justSynced: true
      });

      //wait 3 seconds before allowing another sync API call
      setTimeout(
        this.setState({
          justSynced: false
        })
      , 3000);
    }
  }

  setTrackProgress = async () => {
    this.setState({
      progress_ms: this.state.progress_ms + 500
    });

    if (this.state.progress_ms > this.state.nowPlaying.duration_ms) {
      //update currentlyPlaying with new track
      this.syncNewTrack();
    }
  }

  // Make a call to the spotify ext API from getCurrentlyPlaying
  getCurrentlyPlaying = async () => {
    clearInterval(this.state.syncTimer);

    await spotifyApi.getMyCurrentPlaybackState()
      .then(async (response) => {
        if (response.item.artists) {
          this.setState({
            response: response,
            nowPlaying: response.item,
            deviceId: response.device.id,
            deviceName: response.device.name,
            isPlaying: response.is_playing,
            progress_ms: response.progress_ms, 
          });
        }
      }).finally(async () => {
        clearInterval(this.state.syncTimer);
          // start interval time to update the progress_bar in PlayerComp if track isPlaying
          if (this.state.isPlaying) {
            this.setState({
              syncTimer: setInterval(this.setTrackProgress, 500)
            })
          } else {
            clearInterval(this.state.syncTimer);
          }
      }).catch((err) => {
        console.log(`${err} in the spotify getCurrentlyPlaying ext API lib call`);
      }
    );
  }

  // Make a call to the spotify ext API from getArtistResults
  searchArtists = async (searchTerm) => {
    await spotifyApi.searchArtists(searchTerm)
      .then(async (response) => {
        this.setState({
          artistResults: response.artists.items,
          response: response
        });
      }).catch((err) => {
        console.log(`${err} in the spotify searchArtists ext API lib call`);
      }
    );
  }

  // Make a call to the spotify ext API from getArtistDetails
  getArtistDetails = async (artistId) => {
    await spotifyApi.getArtist(artistId)
      .then(async (response) => {
        this.setState({
          artistDetails: response.artist,
          response: response
        });
      }).catch((err) => {
        console.log(`${err} in the spotify getArtistDetails ext API lib call`);
      }
    );
  }

    // Make a call to the spotify ext API to getAudioTrackFeatures
  getTrackFeatures = async () => {
    await spotifyApi.getAudioFeaturesForTrack(this.state.nowPlaying.id)
      .then(async (response) => {
        this.setState({
          trackFeatures: response.track,
          response: response
        });
      }).catch((err) => {
        console.log(`${err} in the spotify getTrackFeatures ext API lib call`);
      }
    );
  }

  // Make a call to the spotify ext API from previousTrack
  previousTrack = async () => {
    await spotifyApi.skipToPrevious()
      .then(async (response) => {
        this.setState({
          response: response,
        });
        // update setDeviceName for PlayerComp to current nowPlaying device
        await this.setDeviceName();
        setTimeout(this.getCurrentlyPlaying, 200);
      }).finally((err) => {
        console.log(`${err} in the spotify previousTrack ext API lib call`);
      }).catch((err) => {
        console.log(`${err} in the spotify previousTrack ext API lib call`);
      }
    );
  }

   // Make a call to the spotify ext API from nextTrack
   nextTrack = async () => {
    await spotifyApi.skipToNext()
      .then(async (response) => {
        this.setState({
          response: response,
        });
        // update setDeviceName for PlayerComp to current nowPlaying device
        await this.setDeviceName();
        setTimeout(this.getCurrentlyPlaying, 200);
      }).catch((err) => {
        console.log(`${err} in the spotify nextTrack ext API lib call`);
      }
    );
  }

  // Make a call to the spotify ext API from pauseTrack
  pauseTrack = async () => {
    await spotifyApi.pause()
      .then(async (response) => {
        this.setState({
          response: response,
          isPlaying: false,
        });
        // update setDeviceName for PlayerComp to current nowPlaying device
        await this.setDeviceName();
        await this.getCurrentlyPlaying();
      }).catch((err) => {
        console.log(`${err} in the spotify pauseTrack ext API lib call`);
      }
    );
  }

  // Make a call to the spotify ext API from playTrack
  playTrack = async (uri) => {
    clearInterval(this.state.syncTimer);

    // update setDeviceName for PlayerComp to current nowPlaying device
    await this.setDeviceName();

    if (!this.state.deviceId && this.allDeviceIds) {
      await this.setState({
        deviceId: this.allDeviceIds[0].id
      });
    }

    if (uri === "" && this.state.nowPlaying.artists[0].name) {
      await spotifyApi.play({"device_id": this.state.deviceId})
        .then(async (response) => {
          this.setState({
            isPlaying: true,
            response: response,
          });
        }).catch((err) => {
          console.log(`${err} in the spotify playTrack ext API lib call`);
        });
    } else if (uri !== "" && this.state.artistResults[0]) {
      await spotifyApi.play({"device_id": this.state.deviceId, "context_uri": uri})
      .then(async (response) => {
        this.setState({
          isPlaying: true,
          response: response,
        });
      }).catch((err) => {
        console.log(`${err} in the spotify playTrack ext API lib call`);
      });
    } else {
      await spotifyApi.play({"device_id": this.state.deviceId, "context_uri": "spotify:album:2aEfwug3iZ4bivziB14C1F"})
        .then(async (response) => {
          this.setState({
            isPlaying: true,
            response: response,
          });
        }).catch((err) => {
          console.log(`${err} in the spotify playTrack ext API lib call`);
        }
      );
    }

    // sync with Spotify and getCurrentlyPlaying state
    await this.getCurrentlyPlaying();
    setTimeout(this.getCurrentlyPlaying, 200);
  }

  // Make a call to the spotify ext API from getDeviceIds
  getMe = async () => {
    await spotifyApi.getMe()
    .then(async (response) => {
      // console.log(response, "sPUser")
      this.setState({
        sPUser: response,
      });
    }).catch((err) => {
      console.log(`${err} in the spotify getDeviceIds ext API lib call`);
    });
  }

  toggleJS = () => {
    this.setState(prevState => ({
      js: !prevState.js
    }));
  }

  createCocktail = async (formData) => {
    const newCocktail = await fetch(`${process.env.REACT_APP_BACKEND_ADDRESS}/api/v1/cocktails`, {
      credentials: 'include',
      method: "POST",
      body: JSON.stringify(formData),
      headers: {
          "Content-Type": 'application/json'
      }
    })
    const parsedResponse = await newCocktail.json();
    if(parsedResponse.status === 200){
      // console.log(`Cocktail with _id:${parsedResponse.data._id} was created`);
      this.setState({
          newCocktail: parsedResponse.data
      }, ()=>{
          this.state.history.push("/cocktails")
      })
    } else {
      console.log('The Cocktail creation was unsuccessful');
    }
  }

  updateCocktail = async (cocktail) => {
    const updatedCocktail = await fetch(`${process.env.REACT_APP_BACKEND_ADDRESS}/api/v1/cocktails`, {
      credentials: 'include',
      method: "PUT",
      body: JSON.stringify(cocktail),
      headers: {
          "Content-Type": 'application/json'
      }
    })
    const parsedResponse = await updatedCocktail.json();
    if(parsedResponse.status === 200){
      //console.log(`Cocktail with _id:${parsedResponse.data._id} was updated`);
        this.setState({
            updatedCocktail: parsedResponse.data
        }, ()=>{
            this.state.history.push("/cocktails")
        })
    } else {
      console.log('The Cocktail update was unsuccessful');
    }
  }

  deleteCocktail = async () => {
    try {
      const deletedCocktail = await fetch(`${process.env.REACT_APP_BACKEND_ADDRESS}/api/v1/cocktails/${this.state.cocktail.data._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (deletedCocktail.status === 200) {
        //console.log(`Cocktail with _id:${this.state.cocktail.data._id} was deleted`);
      } else {
        //console.log('The Cocktail delete was unsuccessful');
      }
    } catch(err) {
      console.log(err);
    }
  }

  createUser = async () => {
    try {
      const dbUser = {};
      if (this.state.sPUser) {
        dbUser.display_name = this.state.sPUser.display_name;
        dbUser.sP_id = this.state.sPUser.id;
        dbUser.country = this.state.sPUser.country;
      } else {
        console.log('No sPUser data found in state in createUser');
        return null;
      }

      const createdUser = await fetch(`${process.env.REACT_APP_BACKEND_ADDRESS}/api/v1/users/register`, {
        credentials: 'include',
        method: "POST",
        body: JSON.stringify(dbUser),
        headers: {
            "Content-Type": 'application/json'
        }
      });
      const parsedResponse = await createdUser.json();
      if(parsedResponse.status === 200){
        // console.log(`User with _id:${parsedResponse.data._id} was created`);
        this.setState({
            newUser: parsedResponse.data,
            curUser: parsedResponse.data
        }, ()=>{
            this.state.history.push("/users")
        })
        return parsedResponse.data;
      } else {
        console.log('The User creation was unsuccessful');
        return null;
      }
    } catch (err) {
      console.log(err);
    }
  }

  loginUser = async () => {
    try {
      if (this.state.token && this.state.sPUser) {
        const loginUser = await fetch(`${process.env.REACT_APP_BACKEND_ADDRESS}/api/v1/users/login`, {
          credentials: 'include',
          method: "POST",
          body: JSON.stringify(this.state.sPUser),
          headers: {
            "Content-Type": 'application/json'
          }
        })
        const parsedResponse = await loginUser.json();
        if(parsedResponse.status === 200){
          // console.log(`User with _id:${parsedResponse.data._id} was logged in`);
          this.setState({
            curUser: parsedResponse.data
          }, ()=>{
            this.state.history.push("/users")
          })
          return this.state.curUser;
        } else {
          console.log('The User login was unsuccessful');
          return null;
        }
      } else {
        console.log ("Please log in to Spotify before using app.")
      }
    } catch (err) {
      console.log(err);
    }
  }

  updateUser = async (formData) => {
    try {
      const updatedUser = await fetch(`${process.env.REACT_APP_BACKEND_ADDRESS}/api/v1/users`, {
        credentials: 'include',
        method: "PUT",
        body: JSON.stringify(formData),
        headers: {
            "Content-Type": 'application/json'
        }
      })
      const parsedResponse = await updatedUser.json();
      if(parsedResponse.status === 200){
        //console.log(`User with _id:${parsedResponse.data._id} was updated`);
          this.setState({
              updatedUser: parsedResponse.data
          }, ()=>{
              this.state.history.push("/users")
          })
          return parsedResponse.data;
      } else {
        console.log('The User update was unsuccessful');
        return null;
      }
    } catch (err) {
      console.log(err);
    }
  }

  // favorites or un-favorites a cocktail for a particular user in state/DB
  updateUserCocktails =  async (e, argCocktail) => {
    try {
      let newCocktailsArr;
      // const cocktailIndex = this.cocktailIndexOf(this.state.curUser.cocktails, argCocktail);
      if (this.state.curUser.cocktails.filter(cocktail => cocktail._id === argCocktail._id).length > 0) {
        newCocktailsArr = this.state.curUser.cocktails.filter(cocktail => cocktail._id !== argCocktail._id);
        e.target.setAttribute("src", "/images/GreyWhiteStar.png");
      } else {
        e.target.setAttribute("src", "/images/GreenWhiteStar.png");
        newCocktailsArr = [...this.state.curUser.cocktails, argCocktail];
      }

      if (newCocktailsArr?.length) {
        const updatedUser = await fetch(`${process.env.REACT_APP_BACKEND_ADDRESS}/api/v1/users/${this.state.curUser._id}`, {
          credentials: 'include',
          method: "PUT",
          body: JSON.stringify({ ...this.state.curUser, cocktails: newCocktailsArr }),
          headers: {
              "Content-Type": 'application/json'
          }
        })
        const parsedResponse = await updatedUser.json();
        if (parsedResponse.status === 200) {
            //console.log(`User with _id:${parsedResponse.data._id} was modified to add/remove cocktail _id: ${this.state.cocktail.data._id}`);
            this.setState({
                updatedUser: parsedResponse.data,
                curUser: parsedResponse.data
            }, ()=>{
                this.state.history.push("/users")
            })
            return parsedResponse.data;
        } else {
          console.log('The User cocktail update was unsuccessful');
          return null;
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  deleteUser = async () => {
    try {
      const deletedUser = await fetch(`${process.env.REACT_APP_BACKEND_ADDRESS}/api/v1/users/${this.state.curUser._id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (deletedUser.status === 200) {
        //console.log(`User with _id:${this.state.curUser._id} was deleted`);
        alert(`User with _id:${this.state.curUser._id} was deleted`);
        return deletedUser;
      } else {
        //console.log('The User delete was unsuccessful');
        alert('The User delete was unsuccessful');
        return null;
      }
    } catch(err) {
      console.log(err);
    }
  }

  render() {
    return (
      <div className="App">

        <Navbar color="light" light expand="md">
          <NavbarBrand style={{ margin: 0 }} href="/"><img width="32px" src="/images/transparentLogo.png" alt=""/>{ window.innerWidth > 400 ? 'DRNKJMZ' : '' }</NavbarBrand>
          <div className="nav-btn-container" style={{ justifyContent: this.state.token ? 'space-between' : 'flex-end', marginLeft: '-6vw'}}>
            {this.state.token && <Form id="search-submit" className="form-inline my-2 my-lg-0" action="/search" onSubmit={(e) => { e.preventDefault(); this.handleSubmit(null, this.state.artist); }}>
              <FormGroup id="search-form-group">
                <Input className="form-control mr-sm-2" type="search" name="artist" id="artist-search" onChange={this.handleChange} placeholder={this.state.token ? "Search for Artists here" : "Login with Spotify to Search"} />
                <Button id="submit-btn" className="btn-non-controls btn-sm" type="submit">SUBMIT</Button>
              </FormGroup>
            </Form>}
            <Nav style={{ maxWidth: '95%', margin: this.state.token ? 'auto' : '0 0 0 auto' }} navbar>
              <NavItem>
                <NavLink id="navlink-login-btn" className="btn-non-controls btn-sm"
                  href={`${sPAuthEndpoint}?client_id=${sPClientId}&redirect_uri=${sPRedirectUri}&scope=${sPScopes.join("%20")}&response_type=token&show_dialog=true`}
                >Login With Spotify</NavLink>
              </NavItem>
            </Nav>
          </div>
        </Navbar>

        <header className="App-header">
          {!this.state.token ? (
            <div>
              <h3>Welcome to DRNKJMZ</h3>
              <img className="App-logo" src="/images/blackLogo.png" alt="logo"/><br/><br/><br/>
              <p className="normal-text">An app that links to your <img className="smSpotifyLogo" src="/images/Spotify_Logo_RGB_Green.png" alt="smSpotifyLogo" /> account to recommend the perfect cocktail for your listening experience!</p><br/>
              <a id="login-btn" className="btn btn-non-controls"
                href={`${sPAuthEndpoint}?client_id=${sPClientId}&redirect_uri=${sPRedirectUri}&scope=${sPScopes.join("%20")}&response_type=token&show_dialog=true`}
              >Login With Spotify</a><br/><br/>
            </div>
          ) : (
            <div>
              <h3>Successfully linked to <img className="lgSpotifyLogo" src="/images/Spotify_Logo_RGB_Green.png" alt="lgSpotifyLogo"/></h3>
              <p className="normal-text">Either use the buttons below to control playback or search for a new Artist above.</p>
            </div>
          )}

          {this.state.token && this.state.nowPlaying.artists[0].name && this.state.allDeviceIds && this.state.deviceName && (
            <div className="player-info">
              <PlayerComp
                nowPlaying={this.state.nowPlaying}
                isPlaying={this.state.isPlaying}
                progress_ms={this.state.progress_ms}
                pauseTrack={this.pauseTrack}
                playTrack={this.playTrack}
                currDeviceName={this.state.deviceName}
                currDeviceId={this.state.deviceId}
                devices={this.state.allDeviceIds}
                playOnDevice={this.playOnDevice}
              />
            </div>
          )}

          {this.state.token && (
            <div><br/>
              <Button className="btn" onClick={(e) => {e.preventDefault(); this.previousTrack(); }}>
                <svg className="audio-control-icon" style={{ marginRight: 2, transform: "rotate(180deg)" }} width="20" viewBox="0 0 394.941 394.941" fill="rgb(0,196,85)">
                  <path d="M185.492,211.636v109.588l209.449-123.747L185.492,73.718v109.611L0,73.718v247.506L185.492,211.636z"/>
                </svg>
              </Button>
              <Button className="btn" onClick={(e) => {e.preventDefault(); this.pauseTrack(); }}>
                <svg className="audio-control-icon" style={{ marginLeft: 8 }} width="20" viewBox="0 0 60 60" fill="rgb(0,196,85)">
                  <polygon points="0,0 15,0 15,60 0,60" />
                  <polygon points="25,0 40,0 40,60 25,60" />
                </svg>
              </Button>
              <Button className="btn" onClick={(e) => {e.preventDefault(); this.playTrack(""); }}>
                <svg className="audio-control-icon" style={{ marginLeft: 8 }} width="20" viewBox="0 0 60 60" fill="rgb(0,196,85)">
                  <polygon points="0,0 50,30 0,60" />
                </svg>
              </Button>
              <Button className="btn" onClick={(e) => { e.preventDefault(); this.nextTrack(); }}>
                <svg className="audio-control-icon" style={{ marginLeft: 2 }} width="20" viewBox="0 0 394.941 394.941" fill="rgb(0,196,85)">
                  <path d="M185.492,211.636v109.588l209.449-123.747L185.492,73.718v109.611L0,73.718v247.506L185.492,211.636z"/>
                </svg>
              </Button>
              <br/><br/>
            </div>
          )}

          {this.state.token && this.state.cocktail && this.state.curUser && (
            <div id="curCocktailDivGroup">
              <div>
                <p className="normal-text">A perfect cocktail pairing for {(this.state.artistResults !== null && this.state.nowPlaying !== null) ? this.state.nowPlaying.artists[0].name : 'the Artist'} has been recommended below...</p>
              </div>
              {!this.state.isLoading && <div>
                <div className="cocktailPairingDiv">
                  <strong className="normal-text">{this.state.cocktail.data.name}</strong>
                </div>
                <div className="favoriteBtnDiv">
                  {(this.state.curUser.cocktails.filter((cocktail) => cocktail._id === this.state.cocktail.data._id).length > 0) ? 
                  (
                    <img alt="favoriteButton" title="Click to Favorite this cocktail" className="favoriteBtn" id={this.state.cocktail.data._id} src="/images/GreenWhiteStar.png" onClick={(e) => {e.preventDefault(); this.updateUserCocktails(e, this.state.cocktail.data); }}/>
                  ) : (
                    <img alt="favoriteButton" title="Click to Favorite this cocktail" className="favoriteBtn" id={this.state.cocktail.data._id} src="/images/GreyWhiteStar.png" onClick={(e) => {e.preventDefault(); this.updateUserCocktails(e, this.state.cocktail.data); }}/>
                  )}
                </div>
                <CocktailComp className="clearfix"
                  cocktailDirections={this.state.cocktail.data.directions}
                  cocktailImg={this.state.cocktail.data.img}
                  cocktailId={this.state.cocktail.data.cId}
                />
                <Button id="new-cocktail" className="btn btn-non-controls" onClick={(e) => {e.preventDefault(); this.handleSubmit(e, this.state.nowPlaying.artists[0].name)}}>Get New Cocktail</Button>
              </div>}
            </div>
          )}

          {this.state.token && this.state.cocktail && this.state.curUser.cocktails && (
            <div>
              <div>
                <p className="normal-text">Your previously favorited cocktails are below...</p>
              </div>
              {this.state.curUser.cocktails.map((cocktail) => {
                return(
                  <div key={cocktail._id}>
                    <div className="cocktailPairingDiv">
                      <strong className="normal-text">{cocktail.name}</strong>
                    </div>
                    <div className="favoriteBtnDiv">
                      <img alt="favoriteButton" title="Click to Unfavorite this cocktail" className="favoriteBtn" id={cocktail._id} src="/images/GreenWhiteStar.png" onClick={(e) => {e.preventDefault(); this.updateUserCocktails(e, cocktail); }}/>
                    </div>
                    <CocktailComp className="clearfix"
                      key={cocktail._id}
                      cocktailDirections={cocktail.directions}
                      cocktailImg={cocktail.img}
                      cocktailId={cocktail.cId}
                    />
                  </div>
                )}
              )}
              <br/>
            </div>
          )}
          
          {!this.state.token && (
            <div>
              <br/>
                <p className="normal-text">NOTE: If <img className="smSpotifyLogo" src="/images/Spotify_Logo_RGB_Green.png" alt="landSpotifyLogo" /> is not already streaming, please open the player at <a id="spotify-link" href="https://open.spotify.com/" target="_blank" rel="noopener noreferrer">https://open.spotify.com/</a> before clicking Login.</p>
              <br/>
            </div>
          )}

          {this.state.token && this.state.js && (
            <div>
              <p className="normal-text">Welcome Jake to Admin Mode</p>
              <EditCocktail
               nowPlaying={this.state.nowPlaying}
               cocktailToEdit={this.state.cocktail.data}
              />
              <Button id="delete-cocktail" className="btn btn-non-controls" onClick={(e) => {e.preventDefault(); this.deleteCocktail();}}>DELETE</Button>
              <NewCocktail
              nowPlaying={this.state.nowPlaying}
              cocktailName={this.state.newCocktailName}
              cocktailDirections={this.state.newCocktailDirections}
              cocktailImg={this.state.newCocktailImg}
              cocktailGenres={this.state.newCocktailGenres}
              createCocktail={this.createCocktail}
              />
            </div>
          )}
          <button id="js" onClick={(e) => {e.preventDefault(); this.toggleJS();}}/>
        </header>

        <footer>
          <div>
            Sit back, savor your cocktail, and enjoy the tunes.<br/>
            Drinking problem? Call 1-800-662-HELP (4357)<br/>
            Please drink responsibly.
          </div>
        </footer>
      </div>
    );
  }
}

export default App;
