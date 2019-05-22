/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow
 */

import React, {Component} from 'react';
import {
  Platform, 
  StyleSheet, 
  Text, 
  View,
  Button,
  FlatList,
  Slider,
  Keyboard,
  TextInput,
  NativeModules
} from 'react-native';
import NfcManager, {Ndef} from 'react-native-nfc-manager';
import Tts from 'react-native-tts';
import AsyncStorage from '@react-native-community/async-storage';
import { String } from 'core-js';

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' + 'Cmd+D or shake for dev menu',
  android:
    'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
});

type Props = {};
export default class App extends Component<Props> 
{
  
  state = {
    voices: [],
    ttsStatus: "initiliazing",
    selectedVoice: null,
    speechRate: 0.5,
    speechPitch: 1,
    text: "Esto es un texto de ejemplo. Lo logré"
  };

  constructor(props) 
  {
    super(props);
   
    Tts.addEventListener("tts-start", event =>
      this.setState({ ttsStatus: "started" })
    );
    Tts.addEventListener("tts-finish", event =>
      this.setState({ ttsStatus: "finished" })
    );
    Tts.addEventListener("tts-cancel", event =>
      this.setState({ ttsStatus: "cancelled" })
    );
    //Tts.setDefaultRate(this.state.speechRate);
    //Tts.setDefaultPitch(this.state.speechPitch);
    Tts.getInitStatus().then(this.initTts).then(this.getData).then(this._initConfig);
  }

  componentDidMount()
  {
    //this.getData().then(this._initConfig);
  }

  //#region TTS
  initTts = async () => {
    const voices = await Tts.voices();
    const availableVoices = voices
      .filter(v => !v.networkConnectionRequired && !v.notInstalled)
      .map(v => {
        return { id: v.id, name: v.name, language: v.language };
      });

    const voicesLanguageDevice = this._getVoicesCurrentLanguageDevice(availableVoices);

    let selectedVoice = null;
    if (voicesLanguageDevice && voicesLanguageDevice.length > 0) {
      selectedVoice = voicesLanguageDevice[0].id;
      try {
        await Tts.setDefaultLanguage(voicesLanguageDevice[0].language);
      } catch (err) {
        // My Samsung S9 has always this error: "Language is not supported"
        console.log(`setDefaultLanguage error `, err);
      }
      await Tts.setDefaultVoice(voicesLanguageDevice[0].id);
      this.setState({
        voices: voicesLanguageDevice,
        selectedVoice,
        ttsStatus: "initialized"
      });
    } else {
      this.setState({ ttsStatus: "initialized" });
    }
    console.log("Finish initTts");
  };

  _getVoicesCurrentLanguageDevice(currVoices)
  {
    let languageDevice = this._getLanguageDevice();

     return (currVoices.filter(v => v.language.substring(0, 2).toLowerCase() == languageDevice.toLowerCase()).map(v => {
      return { id: v.id, name: v.name, language: v.language };
    }));
  }

  _getLanguageDevice()
  {
    let systemLanguage = 'es';
    if(Platform.OS == 'android')
    {
      systemLanguage = NativeModules.I18nManager.localeIdentifier;
    }
    if(Platform.OS == 'ios')
    {
      systemLanguage = NativeModules.SettingsManager.settings.AppleLocale;
    }

    const languageCode = systemLanguage.substring(0, 2);

    return languageCode;
  }

  readText = async () => {
    Tts.stop();
    Tts.speak(this.state.text);
  };

  setSpeechRate = async rate => {
    await Tts.setDefaultRate(rate);
    this.setState({ speechRate: rate });

    this.storeData();
  };

  setSpeechPitch = async rate => {
    await Tts.setDefaultPitch(rate);
    this.setState({ speechPitch: rate });
  };

  onVoicePress = async voice => {
    try {
      await Tts.setDefaultLanguage(voice.language);
    } catch (err) {
      // My Samsung S9 has always this error: "Language is not supported"
      console.log(`setDefaultLanguage error `, err);
    }
    await Tts.setDefaultVoice(voice.id);
    this.setState({ selectedVoice: voice.id });
  };

  renderVoiceItem = ({ item }) => {
    return (
      <Button
        style={styles.instructions}
        title={`${item.language} - ${item.name || item.id}`}
        color={this.state.selectedVoice === item.id ? undefined : "#969696"}
        onPress={() => this.onVoicePress(item)}
      />
    );
  };
  //#endregion

  //#region Storage_Data
  storeData = async () => {
    try {
      await AsyncStorage.setItem('@AUDIO_Speed', JSON.stringify(this.state.speechRate))
      await AsyncStorage.setItem('@AUDIO_Pitch', JSON.stringify(this.state.speechPitch))
      await AsyncStorage.setItem('@AUDIO_Voice', this.state.selectedVoice)
    } catch (e) {
      // saving error
    }
  }

  getData = async () => 
  {
    try {
      const speedValue = await AsyncStorage.getItem('@AUDIO_Speed')
      const pitchValue = await AsyncStorage.getItem('@AUDIO_Pitch')
      const voiceValue = await AsyncStorage.getItem('@AUDIO_Voice')

      console.log("Get Single Data: " + voiceValue);
      if(speedValue !== null) 
      {
        this.setState({ speechRate: parseFloat(speedValue)});       
      }
      if(pitchValue !== null) 
      {
        this.setState({ speechPitch: parseFloat(pitchValue)});
      }
      if(voiceValue !== null) 
      {
        // Verificar si existe la voz guardada debido a que el usuario puede cambiar de idioma.
        let isVoiceExist = this.state.voices.filter(v => v.id == voiceValue).map(v => {
          return { id: v.id, name: v.name, language: v.language };
        })

        if(isVoiceExist.length > 0) 
        {
          this.setState({ selectedVoice: voiceValue});
        }
      }
    } catch(e) {
      // error reading value
    }
  }

  // removeValue = async () => {
  //   try {
  //     await AsyncStorage.removeItem('@MyApp_key')
  //   } catch(e) {
  //     // remove error
  //   }
  
  //   console.log('Done.')
  // }

  //#endregion

  _initConfig = async () =>
  {
    console.log("Init Config");
    Tts.setDefaultVoice(this.state.selectedVoice);
    Tts.setDefaultPitch(this.state.speechPitch);
    Tts.setDefaultRate(this.state.speechRate);
  }

  //#region Render
  render() 
  {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{`React Native TTS Example`}</Text>

        <Button title={`Read text`} onPress={this.readText} />

        <Text style={styles.label}>{`Status: ${this.state.ttsStatus ||
          ""}`}</Text>

        <Text style={styles.label}>{`Selected Voice: ${this.state
          .selectedVoice || ""}`}</Text>

        <View style={styles.sliderContainer}>
          <Text
            style={styles.sliderLabel}
          >{`Speed: ${this.state.speechRate.toFixed(2)}`}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.01}
            maximumValue={0.99}
            value={this.state.speechRate}
            onSlidingComplete={this.setSpeechRate}
          />
        </View>

        <View style={styles.sliderContainer}>
          <Text
            style={styles.sliderLabel}
          >{`Pitch: ${this.state.speechPitch.toFixed(2)}`}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2}
            value={this.state.speechPitch}
            onSlidingComplete={this.setSpeechPitch}
          />
        </View>

          <TextInput
            style={styles.textInput}
            multiline={true}
            onChangeText={text => this.setState({ text })}
            value={this.state.text}
            onSubmitEditing={Keyboard.dismiss}
          />
          
        <View style={styles.textInput}>
        <FlatList
          keyExtractor={item => item.id}
          renderItem={this.renderVoiceItem}
          extraData={this.state.selectedVoice}
          data={this.state.voices}
        />
        </View>
      </View>
    );
  }
  //#endregion
} 

const styles = StyleSheet.create({
  container: {
    marginTop: 26,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5FCFF"
  },
  title: {
    fontSize: 20,
    textAlign: "center",
    margin: 10
  },
  label: {
    textAlign: "center"
  },
  sliderContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center"
  },
  sliderLabel: {
    textAlign: "center",
    marginRight: 20
  },
  slider: {
    width: 150
  },
  textInput: {
    borderColor: "gray",
    borderWidth: 1,
    flex: 1,
    width: "100%"
  }
});
