import React, { Component } from "react";
import { 
  Button,
  Collapse,
  Form,
  FormGroup,
  Input,
  Navbar,
  /*NavbarToggler,*/
  NavbarBrand,
  Nav,
  NavItem,
  NavLink,
  /*RouteNavItem,*/
 } from "reactstrap";
import PlayerComp from "./PlayerComp/PlayerComp";
import CocktailComp from "./CocktailComp/CocktailComp";
import EditCocktail from "./EditCocktail/EditCocktail";
import NewCocktail from "./NewCocktail/NewCocktail";
// import logo from "/images/blackLogo.png";
import "./App.css";
// import SpotifyPlayer from "react-spotify-player";
// import Script from "react-load-script"
import SpotifyWebApi from "spotify-web-api-js";
// import { Cookies } from 'react-cookie';

require('dotenv').config()

// set up connection to spotifyApi library
const spotifyApi = new SpotifyWebApi();

// spotify api connection variables (some from private .env)
const sPAuthEndpoint = 'https://accounts.spotify.com/authorize';
const sPClientId = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
const sPRedirectUri= process.env.REACT_APP_SPOTIFY_REDIRECT_URI;
const sPScopes = [
  // 'streaming',
  'user-read-private',
  // 'user-read-birthdate',
  // 'user-read-email',
  // 'user-library-read',
  // 'user-library-modify',
  // 'user-top-read',
  // 'user-follow-read',
  'user-follow-modify',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-read-currently-playing',
  // 'user-read-recently-played',
  // 'playlist-read-private',
  // 'playlist-read-collaborative',
  // 'playlist-modify-public',
  // 'playlist-modify-private',
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
      // player: null,
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
      isOpen: false,
      sPUser: null,
      curUser: null,
      newUser: null,
      updatedUser: null,
    };
    this.getCurrentlyPlaying = this.getCurrentlyPlaying.bind(this);
    this.previousTrack = this.previousTrack.bind(this);
    this.nextTrack = this.nextTrack.bind(this);
    this.playTrack = this.playTrack.bind(this);
    this.pauseTrack = this.pauseTrack.bind(this);
    // this.toggleNav = this.toggleNav.bind(this);
    // this.toggleJS = this.toggleJS.bind(this);
  }
  
  playOnDevice = async (newDeviceId) => {
    await spotifyApi.transferMyPlayback([newDeviceId])
    .then(async (response) => {
      console.log(response, ': response');
      await this.setState({
        deviceId: response.device,
        response: response,
      });
      this.setDeviceName();
    }).catch((err) => {
      console.log(`${err} in the spotify playOnDevice ext API lib call`);
    });
  }

  // Make a call to the spotify ext API from getDeviceIds
  getDeviceIds = async () => {
    await spotifyApi.getMyDevices()
    .then(async (response) => {
      await this.setState({
        allDeviceIds: await response.devices,
      });
    }).catch((err) => {
      console.log(`${err} in the spotify getDeviceIds ext API lib call`);
    });
  }

  // helper function to set this.state.deviceName
  setDeviceName = async () => {
    clearInterval(this.interval);

    // get the user deviceIds
    await this.getDeviceIds();

    if (this.state.allDeviceIds && !this.state.deviceId) {
      await this.setState({
        deviceId: await this.state.allDeviceIds[0].id,
      });
    }

    let locDevice = await this.state.allDeviceIds.filter((aDevice) => aDevice.id === this.state.deviceId)
    await this.setState ({
      deviceName: await locDevice[0].name
    });
    // this.state.allDeviceIds.forEach((aDevice) => {
    //   if (aDevice.id === this.state.deviceId) {
    //     this.setState ({
    //       deviceName: aDevice.name
    //     });
    //   }
    // });
    
    // console.log(this.state.deviceName, "deviceName");
  }

  // Once react page is loaded/mounted after redirect from spotify login,
  // save token in state and in spotifyApi helper library
  componentDidMount = async () => {
    clearInterval(this.interval);
    // Set token from hash
    let _token = hash.access_token;

    // Set token in state if truthy/exists
    if (_token) {
      // save token in state
      await this.setState({
        token: _token
      });

      // set spotifyApi to our access token to be able to make requests
      await spotifyApi.setAccessToken(_token);

      // get the user private data for new User creation in backend
      await this.getMe();

      // search backend Users for logged in Spotify user for saving cocktails
      const loggedUser = await this.loginUser();
      if (!loggedUser) {
        console.log(`No corresponding user found for Spotify user: ${this.state.sPUser.display_name}`);
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

  componentWillUnmount() {
    //clear the interval when unmounting the page to avoid memory leak
    clearInterval(this.interval);
  }
  
  handleChange = (e) => {
    this.setState({
        [e.target.name]: e.target.value
    })
  }

  // // findCocktailImage from ext API call to TheCocktailDB
  // findCocktailImage = async (cId) => {
  //   try{
  //     const searchURL = `https://www.thecocktaildb.com/api/json/v1/1/lookup.php?i=${cId}`;
  //     const result = await fetch(searchURL);
  //     const parsedResult = await result.json();
  //     return parsedResult.drinks[0].strDrinkThumb;
  //   } catch(err) {
  //     console.log(`${err} in the cocktailDB ext API call`);
  //   }
  // }

  getNewCocktail = async (formArtist) => {
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
      console.log(`Unable to access nowPlaying/device data onDidMount: ${err}`);
    }

    if(parsedResponse.status === 200){
  
      // // set the cocktail.img with API call to cocktailsDB
      // if (!parsedResponse.data.img) {
      //     parsedResponse.data.img = await this.findCocktailImage(parsedResponse.data.cId);
      // }

      await this.setState({
          cocktail: await parsedResponse,
          artist: ""
      });
    }
  }
  
  handleSubmit = async (e, formArtist) => {
    clearInterval(this.interval);

    await this.searchArtists(formArtist);

    if (!this.state.artist || !this.state.artistResults[0]) {
      await this.playTrack("");
      document.getElementById('artistSearch').value = '';
    } else {
      await this.playTrack(this.state.artistResults[0].uri);
    }

    await this.getCurrentlyPlaying();

    // if (formArtist = " ") {
    //   formArtist  = this.state.nowPlaying.artists[0].name;
    // }

    console.log(formArtist, ': formArtist from handleSubmit');

    await this.getNewCocktail(formArtist);
  }

  syncNewTrack = async () => {
    clearInterval(this.interval);

    // update setDeviceName for PlayerComp to current nowPlaying device
    await this.setDeviceName();
    // sync with Spotify and getCurrentlyPlaying state
    await this.getCurrentlyPlaying();
    console.log(this.state.nowPlaying.artists[0].name, ': nowPlaying.artist in syncNewTrack');
    // sync with Spotify and get new cocktail state
    await this.handleSubmit(null, this.state.nowPlaying.artists[0].name);
  }

  setTrackProgress = async () => {
    await this.setState({
      progress_ms: this.state.progress_ms + 250
    });

    if (this.state.progress_ms > this.state.nowPlaying.duration_ms) {
      clearInterval(this.interval);
      //update currentlyPlaying with new track
      this.syncNewTrack();
    }
  }

  // Make a call to the spotify ext API from getCurrentlyPlaying
  getCurrentlyPlaying = async () => {
    clearInterval(this.interval);

    await spotifyApi.getMyCurrentPlaybackState()
      .then( async(response) => {
        if (response.item.artists) {
          await this.setState({
            response: await response,
            nowPlaying: await response.item,
            deviceId: await response.device.id,
            isPlaying: await response.is_playing,
            progress_ms: await response.progress_ms, 
          });
        }
      }).catch((err) => {
        console.log(`${err} in the spotify getCurrentlyPlaying ext API lib call`);
      }
    );

    // start interval time to update the progress_bar in PlayerComp
    this.interval = setInterval(await this.setTrackProgress, 250);
  }

  // Make a call to the spotify ext API from getArtistResults
  searchArtists = async (searchTerm) => {
    await spotifyApi.searchArtists(searchTerm)
      .then(async (response) => {
        await this.setState({
          artistResults: await response.artists.items,
          response: await response
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
        await this.setState({
          artistDetails: await response.artist,
          response: await response
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
        await this.setState({
          trackFeatures: await response.track,
          response: await response
        });
      }).catch((err) => {
        console.log(`${err} in the spotify getTrackFeatures ext API lib call`);
      }
    );
  }

  // Make a call to the spotify ext API from previousTrack
  previousTrack = async () => {
    clearInterval(this.interval);
    await spotifyApi.skipToPrevious()
      .then(async (response) => {
        // update setDeviceName for PlayerComp to current nowPlaying device
        await this.setDeviceName();
        await setTimeout(await this.getCurrentlyPlaying, 200);
      }).catch((err) => {
        console.log(`${err} in the spotify previousTrack ext API lib call`);
      }
    );
    this.pauseTrack();
    this.playOnDevice(this.state.allDeviceIds[1].id);
    this.playTrack();
  }

   // Make a call to the spotify ext API from nextTrack
   nextTrack = async () => {
    clearInterval(this.interval);
    await spotifyApi.skipToNext()
      .then(async (response) => {
        // update setDeviceName for PlayerComp to current nowPlaying device
        await this.setDeviceName();
        await setTimeout(await this.getCurrentlyPlaying, 200);
      }).catch((err) => {
        console.log(`${err} in the spotify nextTrack ext API lib call`);
      }
    );
  }

  // Make a call to the spotify ext API from pauseTrack
  pauseTrack = async () => {
    clearInterval(this.interval);
    await spotifyApi.pause()
      .then(async (response) => {
        // update setDeviceName for PlayerComp to current nowPlaying device
        await this.setDeviceName();
        await this.getCurrentlyPlaying();
        await this.setState({
          isPlaying: false,
        });
      }).catch((err) => {
        console.log(`${err} in the spotify pauseTrack ext API lib call`);
        clearInterval(this.interval);
      }
    );
    clearInterval(this.interval);
  }

  // Make a call to the spotify ext API from playTrack
  playTrack = async (uri) => {
    clearInterval(this.interval);

    // update setDeviceName for PlayerComp to current nowPlaying device
    await this.setDeviceName();

    // if (!this.state.deviceId) {
    //   await this.getDeviceIds();
    // }

    if (!this.state.deviceId && this.allDeviceIds) {
      await this.setState({
        deviceId: this.allDeviceIds[0].id
      });
    }

    if (uri === "" && this.state.nowPlaying.artists[0].name) {
      await spotifyApi.play({"device_id": this.state.deviceId})
        .then(async (response) => {
          await this.setState({
            isPlaying: true,
          });
        }).catch((err) => {
          console.log(`${err} in the spotify playTrack ext API lib call`);
        });
    } else if (uri !== "" && this.state.artistResults[0]) {
      await spotifyApi.play({"device_id": this.state.deviceId, "context_uri": uri})
      .then(async (response) => {
        await this.setState({
          isPlaying: true,
        });
      }).catch((err) => {
        console.log(`${err} in the spotify playTrack ext API lib call`);
      });
    } else {
      await spotifyApi.play({"device_id": this.state.deviceId, "context_uri": "spotify:album:2aEfwug3iZ4bivziB14C1F"})
        .then(async (response) => {
          await this.setState({
            isPlaying: true,
          });
        }).catch((err) => {
          console.log(`${err} in the spotify playTrack ext API lib call`);
        }
      );
    }

    // sync with Spotify and getCurrentlyPlaying state
    await this.getCurrentlyPlaying();
    await setTimeout(await this.getCurrentlyPlaying, 200);
  }

  // Make a call to the spotify ext API from getDeviceIds
  getMe = async () => {
    await spotifyApi.getMe()
    .then(async (response) => {
      console.log(response, "sPUser")
      await this.setState({
        sPUser: await response,
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
      console.log(`Cocktail with _id:${parsedResponse.data._id} was created`);
      alert(`Cocktail with _id:${parsedResponse.data._id} was created`);
      await this.setState({
          newCocktail: await parsedResponse.data
      }, ()=>{
          this.state.history.push("/cocktails")
      })
    } else {
      console.log('The Cocktail creation was unsuccessful');
      alert('The Cocktail creation was unsuccessful');
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
      console.log(`Cocktail with _id:${parsedResponse.data._id} was updated`);
        await this.setState({
            updatedCocktail: await parsedResponse.data
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
        console.log(`Cocktail with _id:${this.state.cocktail.data._id} was deleted`);
        alert(`Cocktail with _id:${this.state.cocktail.data._id} was deleted`);
      } else {
        console.log('The Cocktail delete was unsuccessful');
        alert('The Cocktail delete was unsuccessful');
      }
    } catch(err) {
      console.log(err);
    }
  }

  toggleNav() {
    this.setState({
      isOpen: !this.state.isOpen
    });
  }

  createUser = async () => {
    try {
      const dbUser = {};
      if (this.state.sPUser) {
        dbUser.name = this.state.sPUser.display_name;
        dbUser.sP_id = this.state.sPUser.id;
        dbUser.email = this.state.sPUser.email;
        dbUser.birthdate = this.state.sPUser.birthdate;
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
        console.log(`User with _id:${parsedResponse.data._id} was created`);
        await this.setState({
            newUser: await parsedResponse.data,
            curUser: await parsedResponse.data
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
          console.log(`User with _id:${parsedResponse.data._id} was logged in`);
          await this.setState({
            curUser: await parsedResponse.data
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
        console.log(`User with _id:${parsedResponse.data._id} was updated`);
        alert(`User with _id:${parsedResponse.data._id} was updated`);
          await this.setState({
              updatedUser: await parsedResponse.data
          }, ()=>{
              this.state.history.push("/users")
          })
          return parsedResponse.data;
      } else {
        console.log('The User update was unsuccessful');
        alert('The User update was unsuccessful');
        return null;
      }
    } catch (err) {
      console.log(err);
    }
  }

  // // helper function to see if cocktail has been favorited before
  // cocktailIndexOf = (cocktailArr, cocktail) => {
  //   let index = -1;
  //   cocktailArr.forEach((drink) => {
  //     index++;
  //     if (drink._id.toString() === cocktail._id.toString()) {
  //       console.log(index, drink._id, cocktail._id);
  //       return index;
  //     }
  //   });
  //   return index;
  // }

  // favorites or un-favorites a cocktail for a particular user in state/DB
  updateUserCocktails =  async (e, argCocktail) => {
    try {

      // // toggle the color of the favoriteBtn image
      // if (e.target.getAttribute("src") === "/images/GreyWhiteStar.png") {
      //   e.target.setAttribute("src", "/images/GreenWhiteStar.png");
      // } else {
      //   e.target.setAttribute("src", "/images/GreyWhiteStar.png");
      // }

      console.log(this.state.curUser, ": user before added cocktail");

      // const cocktailIndex = this.cocktailIndexOf(this.state.curUser.cocktails, argCocktail);
      console.log(this.state.curUser.cocktails.filter((cocktail) => cocktail._id === argCocktail._id).length, ": filteredCocktailLength");
      if(this.state.curUser.cocktails.filter((cocktail) => cocktail._id === argCocktail._id).length > 0) {
        this.state.curUser.cocktails = this.state.curUser.cocktails.filter((cocktail) => cocktail._id !== argCocktail._id);
        e.target.setAttribute("src", "/images/GreyWhiteStar.png");
        console.log(this.state.curUser, ": user after removing cocktail");
      } else {
        e.target.setAttribute("src", "/images/GreenWhiteStar.png");
        this.state.curUser.cocktails = [...this.state.curUser.cocktails, argCocktail];
        console.log(this.state.curUser, ": user after adding cocktail");
      }

      const updatedUser = await fetch(`${process.env.REACT_APP_BACKEND_ADDRESS}/api/v1/users/${this.state.curUser._id}`, {
        credentials: 'include',
        method: "PUT",
        body: JSON.stringify(this.state.curUser),
        headers: {
            "Content-Type": 'application/json'
        }
      })
      const parsedResponse = await updatedUser.json();
      if(parsedResponse.status === 200){
        console.log(`User with _id:${parsedResponse.data._id} was modified to add/remove cocktail _id: ${this.state.cocktail.data._id}`);
          // await this.updateCocktail(argCocktail);
          await this.setState({
              updatedUser: await parsedResponse.data,
              curUser: await parsedResponse.data
          }, ()=>{
              this.state.history.push("/users")
          })
          return parsedResponse.data;
      } else {
        console.log('The User Cocktail update was unsuccessful');
        return null;
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
        console.log(`User with _id:${this.state.curUser._id} was deleted`);
        alert(`User with _id:${this.state.curUser._id} was deleted`);
        return deletedUser;
      } else {
        console.log('The User delete was unsuccessful');
        alert('The User delete was unsuccessful');
        return null;
      }
    } catch(err) {
      console.log(err);
    }
  }

  render() {
  // // size may also be a plain string using the presets 'large' or 'compact'
  // const size = {
  //   width: '100%',
  //   height: 300,
  // };
  // const view = 'list'; // or 'coverart'
  // const theme = 'black'; // or 'white'

  // console.log("render attempt occurred");

    return (
      <div className="App">

        <Navbar color="light" light expand="md">
        {/* <NavbarToggler onClick={this.toggleNav} /> */}
          <NavbarBrand href="/"><img width="32px" src="/images/transparentLogo.png" alt=""/> DRNKJMZ</NavbarBrand>
            <Form id="search-submit" className="form-inline my-2 my-lg-0" action="/search" onSubmit={(e) => {e.preventDefault(); this.handleSubmit(null, this.state.artist); }}>
              <FormGroup id="search-form-group">
                <Input className="form-control mr-sm-2" type="search" name="artist" id="artistSearch" onChange={this.handleChange} placeholder={this.state.token ? "Search for Artists here" : "Login with Spotify to Search"}/>
                <Button id="submit-btn" className="btn-non-controls btn-sm" disabled={this.state.token ? false : true} type="submit">SUBMIT</Button>
              </FormGroup>
            </Form>
          <Collapse isOpen={this.state.isOpen} navbar>
            <Nav className="ml-auto" navbar>
              <NavItem>
                <NavLink id="navlink-login-btn" className="btn-non-controls btn-sm"
                  href={`${sPAuthEndpoint}?client_id=${sPClientId}&redirect_uri=${sPRedirectUri}&scope=${sPScopes.join("%20")}&response_type=token&show_dialog=true`}
                >Login With Spotify</NavLink>
              </NavItem>
            </Nav>
          </Collapse>
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
                devices={this.state.allDeviceIds}
              />
              {/* <Script
                url="https://sdk.scdn.co/spotify-player.js" 
                onError={this.handleScriptError} 
                onLoad={this.onSpotifyWebPlaybackSDKReady}
              />
              {/* <iframe className="embedded-player" title="embedded-player" src={`https://embed.spotify.com/?uri=${this.state.nowPlaying.album.uri}`} width="300" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"/> */}
            </div>
          )}

          {this.state.token && (
            <div><br/>
              <Button className="btn" onClick={(e) => {e.preventDefault(); this.previousTrack(); }}>&lt;&lt;</Button>
              <Button className="btn" onClick={(e) => {e.preventDefault(); this.pauseTrack(); }}>Pause</Button>
              <Button className="btn" onClick={(e) => {e.preventDefault(); this.playTrack(""); }}> Play </Button>
              <Button className="btn" onClick={(e) => {e.preventDefault(); this.nextTrack(); }}>&gt;&gt;</Button>
              <br/><br/>
            </div>
          )}

          {this.state.token && this.state.nowPlaying && this.state.cocktail && this.state.curUser && (
            <div id="curCocktailDivGroup">
              <div>
                <p className="normal-text">A perfect cocktail pairing for {this.state.artistResults !== null ? this.state.artistResults[0].name : 'the Artist'} has been recommended below...</p>
              </div>
              <div>
                <div className="cocktailPairingDiv">
                  <strong className="normal-text">{this.state.cocktail.data.name}</strong>
                </div>
                <div className="favoriteBtnDiv">
                  {(this.state.curUser.cocktails.filter((cocktail) => cocktail._id === this.state.cocktail.data._id).length > 0) ? 
                  (
                    <img alt="favoriteButton" title="Click to Favorite this drink" className="favoriteBtn" id={this.state.cocktail.data._id} src="/images/GreenWhiteStar.png" onClick={(e) => {e.preventDefault(); this.updateUserCocktails(e, this.state.cocktail.data); }}/>
                  ) : (
                    <img alt="favoriteButton" title="Click to Favorite this drink" className="favoriteBtn" id={this.state.cocktail.data._id} src="/images/GreyWhiteStar.png" onClick={(e) => {e.preventDefault(); this.updateUserCocktails(e, this.state.cocktail.data); }}/>
                  )}
                </div>
                <CocktailComp className="clearfix"
                  nowPlaying={this.state.nowPlaying}
                  cocktailDirections={this.state.cocktail.data.directions}
                  cocktailImg={this.state.cocktail.data.img}
                />
                <Button id="new-cocktail" className="btn btn-non-controls" onClick={(e) => {e.preventDefault(); this.handleSubmit(e, this.state.nowPlaying.artists[0].name)}}>Get New Cocktail</Button>
              </div>
            </div>
          )}

          {this.state.token && this.state.nowPlaying && this.state.cocktail && this.state.curUser.cocktails && (
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
                      <img alt="favoriteButton" title="Click to Unfavorite this drink" className="favoriteBtn" id={cocktail._id} src="/images/GreenWhiteStar.png" onClick={(e) => {e.preventDefault(); this.updateUserCocktails(e, cocktail); }}/>
                    </div>
                    <CocktailComp className="clearfix"
                      key={cocktail._id}
                      nowPlaying={this.state.nowPlaying}
                      cocktailDirections={cocktail.directions}
                      cocktailImg={cocktail.img}
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
            Please drink responsibly and in moderation.<br/>
            Drinking problem? Call 1-800-662-HELP (4357)
          </div>
        </footer>
      </div>
    );
  }
}

export default App;
