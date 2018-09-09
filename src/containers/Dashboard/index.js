import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { withStyles } from '@material-ui/core/styles'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemText from '@material-ui/core/ListItemText'

import ImageIcon from '@material-ui/icons/Image'

import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'

import Avatar from '@material-ui/core/Avatar'

import NetworkOperation from '../../lib/NetworkOperation'
const styles = (theme) => ({
  root: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.palette.background.paper,
  },
})

class Dashboard extends PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      receipts: null,
    }
  }

  componentDidMount() {
    NetworkOperation.getSelf().then(({ data }) => {
      this.setState({
        receipts: data.receipts,
      })
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
        <div>
          <List>
            {state.receipts &&
              state.receipts.map((receipt) => {
                <ListItem>
                  <Avatar>
                    <ImageIcon />
                  </Avatar>
                  <ListItemText primary="Photos" secondary="Jan 9, 2014" />
                </ListItem>
              })}
          </List>
          <List>
            <ListItem>
              <Avatar>
                <ImageIcon />
              </Avatar>
              <ListItemText primary="Photos" secondary="Jan 9, 2014" />
            </ListItem>
            <ListItem>
              <Avatar>
                <ImageIcon />
              </Avatar>
              <ListItemText primary="Work" secondary="Jan 7, 2014" />
            </ListItem>
            <ListItem>
              <Avatar>
                <ImageIcon />
              </Avatar>
              <ListItemText primary="Vacation" secondary="July 20, 2014" />
            </ListItem>
          </List>
        </div>
      </div>
    )
  }
}

Dashboard.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(Dashboard)
