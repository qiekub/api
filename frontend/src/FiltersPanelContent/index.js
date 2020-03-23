import React from 'react'
import './index.css'

import {
	// ListSubheader,
	// List,
	// ListItem,
	// ListItemText,
	// ListItemIcon,
	// ListItemSecondaryAction,

	// Checkbox,

	Fab,
	Menu,
	MenuItem,
} from '@material-ui/core'

import {
	ArrowDropDown as ArrowDropDownIcon,
} from '@material-ui/icons'
// import {
// 	ToggleButton,
// 	ToggleButtonGroup,
// } from '@material-ui/lab'

import PopupState, { bindTrigger, bindMenu } from 'material-ui-popup-state'

import _categories_ from '../data/dist/categories.json'
console.log('_categories_', _categories_)

export default class FiltersPanelContent extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			windowIsFullscreen: false,

			selectedCategory: null,
		}

		this.selectCategory = this.selectCategory.bind(this)
	}

	selectCategory(item, closeMenuCallback){
		this.setState({selectedCategory: (!!item ? item : null)}, ()=>{
			closeMenuCallback()

			if (this.props.onChange) {
				this.props.onChange(!!item ? {
					presets: item.presets,
				} : null)
			}
		})
	}

	render() {
		return (<>
			<PopupState variant="popover" popupId="demoMenu">
				{popupState => (
					<React.Fragment>
						<Fab
							{...bindTrigger(popupState)}
							size="small"
							variant="extended"
							style={{
								padding: '0 8px 0 16px',
								textTransform: 'none',
								background: 'white',
							}}
						>
							{
								!!this.state.selectedCategory
								? (<>
									<div className="dot" style={{margin:'0 8px 0 -4px',background:this.state.selectedCategory.color.bg}}></div>
									{this.state.selectedCategory.name}
								</>)
								: 'What to show?'
							}
							<ArrowDropDownIcon style={{marginLeft:'16px'}}/>
						</Fab>
						<Menu
							{...bindMenu(popupState)}
							transitionDuration={0}
							anchorOrigin={{
								vertical: 'top',
								horizontal: 'left',
							}}
						>
							<MenuItem value="" onClick={()=>this.selectCategory(null,popupState.close)}>Everything</MenuItem>
							<MenuItem disabled></MenuItem>
							{_categories_.map(category=>{
								const isSelected = (!!this.state.selectedCategory && category.name === this.state.selectedCategory.name)
								return (
								<MenuItem
									key={category.name}
									value={category.name}
									onClick={()=>this.selectCategory(category,popupState.close)}
									selected={isSelected}
									style={{
										background: (isSelected ? category.color.bg : ''),
										color: (isSelected ? category.color.fg : category.color.bg),
									}}
								>
									<div className="dot" style={{background:(isSelected ? category.color.fg : category.color.bg)}}></div>
									{category.name}
								</MenuItem>
								)
							})}
						</Menu>
					</React.Fragment>
				)}
			</PopupState>

			{/*<List dense>
				{this.presetCategories.map(item=>{
					const thisValue = !!this.state.values.hasOwnProperty(item.title) ? this.state.values[item.title] : true
					return (<ListItem button key={item.title}>
						<ListItemIcon style={{minWidth:'0px'}}>
							<Checkbox
								checked={thisValue}
								edge="start"
								onChange={()=>this.handleClick(item)}
							/>
						</ListItemIcon>
						<ListItemText primary={item.title} />
					</ListItem>)
				})}
			</List>*/}

			{/*<List subheader={<ListSubheader>For Whom?</ListSubheader>}>
				{this.forWhom.map(item=>{
					return (<ListItem button key={item.title}>
					<ListItemText primary={item.title} />

					<ListItemSecondaryAction>
						<ToggleButtonGroup
							value={this.state.value}

							onChange={(event,value)=>this.handleGroup(item,value)}
							className="myToggleButtonGroup"
							size="small"
							exclusive
						>
							<ToggleButton value="only">
								Only
							</ToggleButton>
							<ToggleButton value="primary">
								Primary
							</ToggleButton>
						</ToggleButtonGroup>
					</ListItemSecondaryAction>
					</ListItem>)
				})}
			</List>*/}
		</>)
	}
}



