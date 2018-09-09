import React, { PureComponent } from 'react'

import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import Input from '@material-ui/core/Input'
import Button from '@material-ui/core/Button'

import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles'
import blue from '@material-ui/core/colors/blue'

import PropTypes from 'prop-types'
import NetworkOperation from '../../lib/NetworkOperation'

import './styles.pcss'

const theme = createMuiTheme({
  palette: {
    primary: blue,
  },
})

class App extends PureComponent {
  static propTypes = {}

  state = {
    file: null,
    code: false,
    accesCode: null,
    error: null,
    phone: null,
  }

  onChange = (event) => {
    const { value, name } = event.target

    this.setState({
      [name]: value,
      error: null,
    })
  }

  onSubmit = (event) => {
    event.preventDefault()

    NetworkOperation.sendVerficationCode(this.state.phone).then(({ data }) => {
      console.log(data)
      this.setState({
        code: true,
        telephone: this.state.phone,
        phone: '',
        accesCode: '',
      })
    })
  }

  onAccess(event) {
    event.preventDefault()

    const { telephone, accesCode } = this.state

    NetworkOperation.authorize({ telephone, accesCode })
      .then(({ data }) => {
        localStorage.setItem('token', data.token)

        this.props.history.replace(this.state.return || '/dashboard')
      })
      .catch(({ response = {} }) => {
        const { status = 500 } = response
        switch (status) {
          case 400:
          case 401:
            this.setState({
              error: 'Código de autorización incorrecto',
            })
            break
          default:
            this.setState({
              error: 'Problemas al iniciar sesión, intenta nuevamente',
            })
        }
      })
  }

  render() {
    const { state } = this

    return (
      <div className="app">
        <AppBar position="static" color="default">
          <Toolbar>
            <Typography variant="title" color="inherit">
              BBVA Bancomer
            </Typography>
          </Toolbar>
        </AppBar>
        <div className="content">
          <MuiThemeProvider theme={theme}>
            {!state.code ? (
              <Input
                type="text"
                onChange={this.onChange}
                name="phone"
                placeholder="Teléfono"
                value={state.phone}
              />
            ) : (
              <Input
                type="text"
                onChange={this.onChange}
                name="accesCode"
                placeholder="Código"
                value={state.accesCode}
              />
            )}
            {!state.code ? (
              <Button
                variant="contained"
                color="primary"
                type="submit"
                onClick={this.onSubmit}
              >
                Send Verification Code
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                type="submit"
                onClick={this.onAccess}
              >
                Acceder
              </Button>
            )}
            {state.error && (
              <div className="error">
                <p>{state.error}</p>
              </div>
            )}
          </MuiThemeProvider>
        </div>
      </div>
    )
  }
}

App.propTypes = {
  selectedType: PropTypes.string.isRequired,
}

export default App
