import React from "react";
import logo from "./logo.svg";
import "./App.css";
import ImageGallery from "react-image-gallery";

const images = [
  {
    original: "https://picsum.photos/id/1018/1000/600/",
    thumbnail: "https://picsum.photos/id/1018/250/150/",
  },
  {
    original: "https://picsum.photos/id/1015/1000/600/",
    thumbnail: "https://picsum.photos/id/1015/250/150/",
  },
  {
    original: "https://picsum.photos/id/1019/1000/600/",
    thumbnail: "https://picsum.photos/id/1019/250/150/",
  },
  {
    original:
      "http://localhost:2342/api/v1/t/5b3c5b2232d546231205834496ae7f2a567037c2/45c097e5/tile_500",
    thumbnail:
      "http://localhost:2342/api/v1/t/5b3c5b2232d546231205834496ae7f2a567037c2/45c097e5/fit_2048",
  },
  {
    original:
      "http://localhost:2342/api/v1/t/a59b5326a1726eeefeedec8ad33c9cd4787de492/45c097e5/fit_2048",
    thumbnail:
      "http://localhost:2342/api/v1/t/a59b5326a1726eeefeedec8ad33c9cd4787de492/45c097e5/tile_500",
  },
];

class MyGallery extends React.Component {
  render() {
    return <ImageGallery items={images} />;
  }
}
function App() {
  return <MyGallery />;
}

export default App;
