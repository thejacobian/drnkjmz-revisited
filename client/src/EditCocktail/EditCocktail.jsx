import React, {Component } from 'react';

class EditCocktail extends Component{
  constructor(props){
    super(props);
    this.state = {
      cId: this.props.cocktailToEdit.cId,
      _id: this.props.cocktailToEdit._id,
      name: this.props.cocktailToEdit.name,
      directions: this.props.cocktailToEdit.directions,
      img: this.props.cocktailToEdit.img,
      genres: this.props.cocktailToEdit.genres[0],
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
            Name: <input type="text" name="name" defaultValue={this.props.cocktailToEdit.name} onChange={this.handleChange}/><br/>
            Directions: <textarea type="text" name="directions" defaultValue={this.props.cocktailToEdit.directions} onChange={this.handleChange}/><br/>
            ImgUrl: <input type="text" name="img" defaultValue={this.props.cocktailToEdit.img} onChange={this.handleChange}/><br/>
            Genres: <input type="text" name="genres" defaultValue={this.props.cocktailToEdit.genres[0]} onChange={this.handleChange}/><br/>
            <button className="btn btn-non-controls" type="submit">SUBMIT</button>
            <div className="background" style={backgroundStyles} />{" "}
          </form>
  }
}

export default EditCocktail;
