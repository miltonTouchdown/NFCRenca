import { StyleSheet } from 'react-native';

const baseColor='#F5FCFF';

export default StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column'
  },
  header: {
    flex: 1,
    backgroundColor: baseColor,   
  },
  content: {
    flex: 8,
    backgroundColor: baseColor,
    alignItems: 'center',
    justifyContent: 'center'
  },
  footer: {
    flex: 1.5,
    backgroundColor: baseColor,
    alignItems: 'center'
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 0,
    marginRight:10
  },
  column: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  contentImage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: baseColor,
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  button:{
    color: '#333333',
    alignItems: 'center',   
  },
  bottom:{
    flex:1,
    marginBottom:10,
    justifyContent: 'flex-end',
  },
  trackSlider: {
    height: 4,
    borderRadius: 2,
  },
  thumbSlider: {
    width: 30,
    height: 30,
    borderRadius: 30 / 2,
    backgroundColor: 'white',
    borderColor: '#30a935',
    borderWidth: 2,
  },
  labelSlider: {
    textAlign: "center",
    color: '#333333',
    marginRight: 20
  },
  containerSlider: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  slider: {
    width: 150
  },
  containerOverlay: {
    justifyContent: 'space-around',
  },
});