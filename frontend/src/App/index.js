import React from 'react'
import './index.css'

// import {gql} from 'apollo-boost'
import {Router,navigate} from '@reach/router'
import {
	loadPoi as query_loadPoi,
	search as query_search,
} from '../queries.js'

import {
	Fab,
	// Drawer,

	Card,
	// CardActions,
	CardActionArea,
	// CardContent,
	// Typography,
	Divider,
	// Button,
	Checkbox,

	List,
	ListItem,
	ListItemText,
	// ListItemIcon,
	ListItemSecondaryAction,
} from '@material-ui/core'
import {
	Add as AddIcon,
	FilterList as FilterListIcon,
	// ExpandLess as ExpandLessIcon,
} from '@material-ui/icons'

import PageMap from '../PageMap/index.js'
import SearchBar from '../SearchBar/index.js'
// import InfoCard from '../InfoCard/index.js'
import Sidebar from '../Sidebar/index.js'
// import FiltersPanelContent from '../FiltersPanelContent/index.js'

import 'typeface-roboto'

import categories from '../data/dist/categories.json'
console.log('categories', categories)

export default class App extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			searchBarValue: '',
			sidebarIsOpen: false,
			doc: null,
			filtersPanelIsOpen: true,
		}

		this.functions = {}

		this.startSearch = this.startSearch.bind(this)
		this.setSearchBarValue = this.setSearchBarValue.bind(this)
		this.setSidebarIsOpen = this.setSidebarIsOpen.bind(this)
		this.addPlace = this.addPlace.bind(this)
		this.loadAndViewDoc = this.loadAndViewDoc.bind(this)

		this.toggleFiltersPanel = this.toggleFiltersPanel.bind(this)

		this.setView = this.setView.bind(this)
		this.flyTo = this.flyTo.bind(this)
		this.getZoom = this.getZoom.bind(this)
	}

	toggleFiltersPanel(){
		this.setState((state,props)=>{
			return {filtersPanelIsOpen:!state.filtersPanelIsOpen}
		})
	}

	saveFunctions(componentName, functionsObject){
		this.functions[componentName] = functionsObject
	}

	setSearchBarValue(value){
		this.setState({searchBarValue:value})
	}
	setSidebarIsOpen(value){
		this.setState({sidebarIsOpen:value})
	}

	startSearch(queryString,callback){
		if (queryString && queryString !== '' && queryString.length > 1 && /\S/.test(queryString)) {
			window.graphql.query({
				query: query_search,
				variables: {query: queryString},
			}).then(async result => {
				await navigate(`/`)

				this.functions['PageMap'].flyToBounds([
					[
						result.data.search.geometry.boundingbox.southwest.lat,
						result.data.search.geometry.boundingbox.southwest.lng,
					],
					[
						result.data.search.geometry.boundingbox.northeast.lat,
						result.data.search.geometry.boundingbox.northeast.lng,
					]
				], {
					animate: true,
					duration: 1.5,
				})

				// this.functions['PageMap'].setBounds([
				// 	[result.data.geocode.boundingbox[0], result.data.geocode.boundingbox[2]],
				// 	[result.data.geocode.boundingbox[1], result.data.geocode.boundingbox[3]]
				// ])
				callback()
			}).catch(error=>{
				console.error(error)
				callback()
			})
		}else{
			callback()
		}
	}

	loadAndViewDoc(docID){
		if (docID && docID !== '' && docID.length > 1 && /\S/.test(docID)) {
			window.graphql.query({
				query: query_loadPoi,
				variables: {_id:docID},
			}).then(async result=>{
				const doc = result.data.getPlace
		
				if (doc !== null) {
					this.functions['Sidebar'].setDoc(doc)
		
					let zoomLevel = this.functions['PageMap'].getZoom()
					if (zoomLevel < 17) {
						zoomLevel = 17
					}
					
					if (new Date()*1 - window.pageOpenTS*1 < 2000) {
						this.functions['PageMap'].setView(
							[doc.properties.geometry.location.lat,doc.properties.geometry.location.lng],
							zoomLevel
						)
					// }else{
					// 	this.functions['PageMap'].flyTo(
					// 		[doc.properties.geometry.location.lat,doc.properties.geometry.location.lng],
					// 		zoomLevel,
					// 		{
					// 			animate: true,
					// 			duration: 1,
					// 		}
					// 	)
					}
				}
			}).catch(error=>{
				console.error(error)
			})
		}
	}

	async addPlace(){

		await navigate(`/place/add/`)
		setTimeout(()=>{
			this.functions['Sidebar'].editNewDoc('Place')
		}, 100)

		// this.setState({doc:{
		// 	_id: null,
		// 	properties: {
		// 		__typename: 'Place',
		// 	},
		// }}, async ()=>{
		// 	await navigate(`/place/add/`)
		// })
	}

	setView(...attr){
		return this.functions['PageMap'].setView(...attr)
	}
	flyTo(...attr){
		return this.functions['PageMap'].flyTo(...attr)
	}
	getZoom(...attr){
		return this.functions['PageMap'].getZoom(...attr)
	}

	render() {
		return (<>
			<SearchBar
				className="SearchBar"
				onStartSearch={this.startSearch}
				value={this.state.searchBarValue}
				sidebarIsOpen={this.state.sidebarIsOpen}
				onSetSidebarIsOpen={this.setSidebarIsOpen}
				onSetSearchBarValue={this.setSearchBarValue}
			/>

			{/*<InfoCard
				className="InfoCard"
				place={this.state.selectedPlace}
			/>*/}

			<Fab variant="extended" className="addNewFab" onClick={this.addPlace}>
				<AddIcon style={{marginRight:'8px'}} />
				Add a Place
			</Fab>

			<Fab className="toggleFiltersFab" onClick={this.toggleFiltersPanel}>
				<FilterListIcon />
			</Fab>
			{/*<Drawer
				open={this.state.filtersPanelIsOpen}
				onClose={this.toggleFiltersPanel}
				variant="permanent"
				anchor="right"
				className="filtersPanel"
			>
				<FiltersPanelContent />
			</Drawer>*/}

			<Card className={'filtersPanel '+(this.state.filtersPanelIsOpen ? ' open' : 'closed')} elevation={6}>
				<div style={{display:(this.state.filtersPanelIsOpen ? 'block' : 'none')}}>					
					<List>
						<ListItem button style={{width:'300px'}}>
							<ListItemText primary="Line item" />
							<ListItemSecondaryAction>
								<Checkbox edge="end"/>
							</ListItemSecondaryAction>
						</ListItem>
					</List>
					<Divider />
				</div>
				<CardActionArea className="CardActionArea" onClick={this.toggleFiltersPanel}>
					<ListItem button className="ListItem">
						<ListItemText className="ListItemText" primary="Filter verbergen" />
						<ListItemSecondaryAction className="ListItemSecondaryAction">
							<FilterListIcon />
						</ListItemSecondaryAction>
					</ListItem>
				</CardActionArea>
			</Card>

			<Router primary={false}>
				<Sidebar
					path="/place/:docID"
					className="Sidebar"
					
					hello="test"

					onViewDoc={this.loadAndViewDoc}
					onSetSearchBarValue={this.setSearchBarValue}
					onSetSidebarIsOpen={this.setSidebarIsOpen}

					onSetView={this.setView}
					onFlyTo={this.flyTo}
					onGetZoom={this.getZoom}
					onFunctions={(...attr)=>{this.saveFunctions('Sidebar',...attr)}}
				/>
			</Router>
			
			<PageMap
				className={'page'+(this.state.sidebarIsOpen ? ' sidebarIsOpen' : '')}
				onViewDoc={this.loadAndViewDoc}
				onFunctions={(...attr)=>{this.saveFunctions('PageMap',...attr)}}
			/>
		</>)
	}
}