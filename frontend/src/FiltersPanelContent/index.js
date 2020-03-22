import React from 'react'
// import './index.css'

import {
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
	Divider,
} from '@material-ui/core'

import {
	History as HistoryIcon,
	// ContactSupport as ContactSupportIcon,
	Fullscreen as FullscreenIcon,
	FullscreenExit as FullscreenExitIcon,
} from '@material-ui/icons'

export default class FiltersPanelContent extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			windowIsFullscreen: false,
		}

		this.toogleFullscreen = this.toogleFullscreen.bind(this)
	}

	toogleFullscreen(){
		if (document.fullscreenEnabled) {
			if (document.fullscreenElement === null) {
				document.querySelector('body').requestFullscreen().then(()=>{
					this.setState({windowIsFullscreen:true})
				})
			}else{
				document.exitFullscreen().then(()=>{
					this.setState({windowIsFullscreen:false})
				})
			}
		}
	}

	render() {
		return (<>
			<List>
				<ListItem>
					<ListItemIcon><HistoryIcon style={{color:'black'}} /></ListItemIcon>
					<ListItemText primary="Changes Under Review" />
				</ListItem>
			</List>
			<Divider />
			<List>
				<ListItem>
					<ListItemText primary="Imprint + Privacy Policy" />
				</ListItem>
				<ListItem>
					<ListItemText primary="Contact" />
				</ListItem>
			</List>
			<Divider />
			<List>
				{document.fullscreenEnabled ? (<ListItem button onClick={this.toogleFullscreen}>
					<ListItemIcon>
						{this.state.windowIsFullscreen ? <FullscreenExitIcon style={{color:'black'}} /> : <FullscreenIcon style={{color:'black'}} />}
					</ListItemIcon>
					<ListItemText primary={this.state.windowIsFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'} />
				</ListItem>) : null}
			</List>
		</>)
	}
}



