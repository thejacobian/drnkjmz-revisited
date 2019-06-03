import React, {Component } from 'react';

class NewCocktail extends Component{
  constructor(){
    super();
    this.state = {
        name: "",
        directions: "",
        img: "",
        genres: "",
    }
  }
  
  handleChange = (e) => {
    this.setState({
        [e.target.name]: e.target.value
    })
  }

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.createCocktail(this.state);
  }

  render () {
    const backgroundStyles = {
      backgroundImage:`url(${this.props.nowPlaying.album.images[0].url})`,
    };

    return <form onSubmit={this.handleSubmit}>
            <p className="normal-text">Create Cocktail</p>
            Name: <input type="text" name="name" onChange={this.handleChange}/><br/>
            Directions: <textarea type="text" defaultValue="Ingredients: Instructions: "name="directions" onChange={this.handleChange}/><br/>
            Image Url: <input type="text" name="img" onChange={this.handleChange}/><br/>
            Genres: <input type="text" name="genres" onChange={this.handleChange}/><br/>
            <button className="btn btn-non-controls" type="submit">SUBMIT</button>
            <div className="background" style={backgroundStyles} />{" "}
          </form>
  }
}

export default NewCocktail;