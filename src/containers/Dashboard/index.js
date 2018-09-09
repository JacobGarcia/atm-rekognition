import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import { withStyles } from '@material-ui/core/styles'
import AppBar from '@material-ui/core/AppBar'
import Toolbar from '@material-ui/core/Toolbar'
import Typography from '@material-ui/core/Typography'

import Table from '@material-ui/core/Table'
import TableBody from '@material-ui/core/TableBody'
import TableCell from '@material-ui/core/TableCell'
import TableHead from '@material-ui/core/TableHead'
import TableRow from '@material-ui/core/TableRow'
import Paper from '@material-ui/core/Paper'

import NetworkOperation from '../../lib/NetworkOperation'
const styles = (theme) => ({
  root: {
    width: '100%',
    marginTop: theme.spacing.unit * 3,
    overflowX: 'auto',
  },
  table: {
    minWidth: 700,
  },
})

let id = 0
function createData(name, calories, fat, carbs, protein) {
  id += 1
  return { id, name, calories, fat, carbs, protein }
}

const rows = [
  createData('Frozen yoghurt', 159, 6.0, 24, 4.0),
  createData('Ice cream sandwich', 237, 9.0, 37, 4.3),
  createData('Eclair', 262, 16.0, 24, 6.0),
  createData('Cupcake', 305, 3.7, 67, 4.3),
  createData('Gingerbread', 356, 16.0, 49, 3.9),
]

class Dashboard extends PureComponent {
  constructor(props) {
    super(props)
    this.state = {
      receipts: null,
    }
  }

  componentDidMount() {
    NetworkOperation.getSelf().then(({ data }) => {
      console.log(data)
      this.setState(
        {
          receipts: data.user.receipts,
        },
        () => {
          console.log(this.state.receipts)
        }
      )
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
          <Paper>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Operación</TableCell>
                  <TableCell>Cuenta</TableCell>
                  <TableCell numeric>Importe</TableCell>
                  <TableCell numeric>Folio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {state.receipts &&
                  state.receipts.map((receipt) => {
                    return (
                      <TableRow key={receipt}>
                        <TableCell component="th" scope="row">
                          <TableCell numeric>
                            {receipt.timestamp.toLocaleDateString()}
                          </TableCell>
                          <TableCell>{receipt.transaction}</TableCell>
                          <TableCell>{receipt.account}</TableCell>
                          <TableCell numeric>{receipt.ammount}</TableCell>
                          <TableCell numeric>{receipt.folio}</TableCell>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </Paper>
        </div>
      </div>
    )
  }
}

Dashboard.propTypes = {
  classes: PropTypes.object.isRequired,
}

export default withStyles(styles)(Dashboard)
