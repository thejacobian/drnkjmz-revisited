import React, {Component } from 'react';

class EditCocktail extends Component{
  constructor(props){
    super(props);
    this.state = {
        name: this.props.cocktailName,
        directions: this.props.cocktailDirections,
        img: this.props.cocktailImg,
        genres: this.props.cocktailGenres[0],
    }
  }
  
  handleChange = (e) => {
    this.setState({
        [e.target.name]: e.target.value
    })
  }

  handleSubmit = (e) => {
    e.preventDefault();
    this.props.updateCocktail(this.state);
  }

  render () {
    const backgroundStyles = {
      backgroundImage:`url(${this.props.nowPlaying.album.images[0].url})`,
    };

    return <form onSubmit={this.handleSubmit}>
            <p className="normal-text">Edit Cocktail</p>
            Name: <input type="text" name="name" defaultValue={this.props.cocktailName} onChange={this.handleChange}/><br/>
            Directions: <textarea type="text" name="directions" defaultValue={this.props.cocktailDirections} onChange={this.handleChange}/><br/>
            Image Url: <input type="text" name="img" defaultValue={this.props.cocktailImg} onChange={this.handleChange}/><br/>
            Genres: <input type="text" name="genres" defaultValue={this.props.cocktailGenres[0]} onChange={this.handleChange}/><br/>
            <button className="btn btn-non-controls" type="submit">SUBMIT</button>
            <div className="background" style={backgroundStyles} />{" "}
          </form>
  }
}

export default EditCocktail;
