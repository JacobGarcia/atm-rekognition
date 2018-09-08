import React, { PureComponent } from 'react'
import axios from 'axios'

import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'
import Input from '@material-ui/core/Input'
import Button from '@material-ui/core/Button'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'

import './styles.pcss'

class App extends PureComponent {
  static propTypes = {}

  state = {
    file: null,
    code: null,
    error: null,
  }

  onChange = ({ target }) =>
    this.setState({
      code: null,
      file: target.files[0],
    })

  onSubmit = (event) => {
    event.preventDefault()

    const data = new FormData()
    data.append('file', this.state.file)

    axios
      .post('http://localhost:8080/extract', data)
      .then(({ data }) => this.setState({ code: data.code }))
      .catch((error) => this.setState({ error }))
  }

  render() {
    const {
      state: { code },
    } = this

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
          <Input type="text" onChange={this.onChange} />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            onClick={this.onSubmit}
          >
            Send
          </Button>
          {code && (
            <div>
              <Card>
                <CardContent>
                  The code is: <strong>{code}</strong>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    )
  }
}

export default App
