import React from 'react'
import {Map, TileLayer} from 'react-leaflet'

import {navigate} from '@reach/router'
import {
	// loadPois as query_loadPois,
	loadMarkers as query_loadMarkers,
} from '../queries.js'

import './index.css'
// import '../conic-gradient-polyfill.js'

// import categories from '../data/dist/categories.json'
import presets from '../data/dist/presets.json'
import colors from '../data/dist/colors.json'
import colorsByPreset from '../data/dist/colorsByPreset.json'
import {getPreset, getColorByPreset, getWantedTagsList} from '../functions.js'

// import {
// 	Icon,
// } from '@material-ui/core'


import L from 'leaflet'
import './leaflet/leaflet.css'

// import { PruneCluster, PruneClusterForLeaflet } from 'exports-loader?PruneCluster,PruneClusterForLeaflet!prunecluster/dist/PruneCluster.js'
import {PruneCluster, PruneClusterForLeaflet} from './PruneCluster_dist/PruneCluster.js'

PruneCluster.Cluster.ENABLE_MARKERS_LIST = true


// import MarkerClusterGroup from 'react-leaflet-markercluster'
// import 'react-leaflet-markercluster/dist/styles.min.css'

// import image_markerIcon1x from './marker_icon/dot_pinlet-2-medium-1x.png'
// import image_markerIcon2x from './marker_icon/dot_pinlet-2-medium-2x.png'

// const markerIcon = new L.Icon({
// 	// https://www.google.com/maps/vt/icon/name=assets/icons/poi/tactile/pinlet_shadow_v3-2-medium.png,assets/icons/poi/tactile/pinlet_outline_v3-2-medium.png,assets/icons/poi/tactile/pinlet_v3-2-medium.png,assets/icons/poi/quantum/pinlet/dot_pinlet-2-medium.png&highlight=ff000000,ffffff,607D8B,ffffff?scale=4
// 	iconUrl: image_markerIcon1x,
// 	iconRetinaUrl: image_markerIcon2x,
// 	iconSize: [23, 32],
// 	iconAnchor: [12.5, 32],
// 	popupAnchor: [0, -32],
// })



export default class PageMap extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			docs: [],
			bounds: null,
		}

		this.viewportChangedTimeout = null;

		// this.MarkerLayerRef = React.createRef()
		this.map = null

		this.showPlace = this.showPlace.bind(this)
		this.gotMapRef = this.gotMapRef.bind(this)
		// this.createCustomIcon = this.createCustomIcon.bind(this)

		this.createPruneCluster = this.createPruneCluster.bind(this)
		this.addMarkersToPruneCluster = this.addMarkersToPruneCluster.bind(this)
	}

	componentDidMount(){
		this.loadMarkers()

		if (this.props.onFunctions) {
			this.props.onFunctions({
				getZoom: () => this.map.getZoom(),
				getBounds: () => this.map.getBounds(),
				flyToBounds: (...attr) => this.map.flyToBounds(...attr),
				setView: (...attr) => this.map.setView(...attr),
				flyTo: (...attr) => this.map.flyTo(...attr),
			})
		}
	}
	componentWillUnmount(){
		clearTimeout(this.viewportChangedTimeout)
	}

	loadMarkers(){
		const ts_s = new Date()*1
		console.log('s', ts_s)

		window.graphql.query({
			query: query_loadMarkers,
			variables: {
				wantedTags: getWantedTagsList(presets), // this gets us about 11% reduction in size
			},
		}).then(result => {

			console.log('ts_diff-1', (new Date()*1)-ts_s)

			const docs = result.data.getMarkers.map(doc=>{
				doc.___preset = getPreset(doc.tags || {}, presets)
				doc.___color = getColorByPreset(doc.___preset.key,colorsByPreset) || colors.default
				return doc
			})

			console.log('ts_diff-2', (new Date()*1)-ts_s)

			this.docs = docs
			this.addMarkersToPruneCluster(docs)
			// this.setState({docs: docs})

			console.log('ts_diff-3', (new Date()*1)-ts_s)


			// const docs = result.data.getPlaces.map(doc=>{
			// 	doc.___preset = getPreset(doc.properties.tags || {}, presets)
			// 	doc.___color = getColorByPreset(doc.___preset.key,colorsByPreset) || colors.default
			// 	return doc
			// })

			// 679779
			// 1556529
			// 1756241

		}).catch(error=>{
			console.error(error)
		})
	}

	async showPlace(doc) {
		await navigate(`/place/${doc._id}/`)
		if (this.props.onViewDoc) {
			this.props.onViewDoc(doc._id)
		}
	}

	gotMapRef(Map){
		this.mapRef = Map
		this.map = Map.leafletElement

		this.createPruneCluster()
	}

	// createCustomIcon(iconName,bg,fg){
	// 	return L.divIcon({
	// 		html: `
	// 			<div class="wrapper material-icons" style="--bg-color:${bg};--fg-color:${fg};">${iconName.toLowerCase()}</div>
	// 		`,
	// 		className: 'marker-custom-icon',
	// 		iconSize: L.point(40, 40, true),
	// 	})
	// }

	getConicGradient(values){
		let stops = []
		let counter = 0
		let currentPos = 0
		for (const pair of values) {
			if (counter === 0) {
				currentPos += Math.ceil(pair[1]*360)
				stops.push(pair[0]+' '+currentPos+'deg')
			}else if (counter === values.length-1) {
				stops.push(pair[0]+' 0')
			}else{
				currentPos += Math.ceil(pair[1]*360)
				stops.push(pair[0]+' 0 '+currentPos+'deg')
			}
			counter += 1
		}
		stops = stops.join(', ')

		var gradient = new window.ConicGradient({
		    stops: stops, // "gold 40%, #f06 0", // required
		    repeating: false, // Default: false
		    size: 100, // Default: Math.max(innerWidth, innerHeight)
		})

		return gradient
	}

	createPruneCluster(){
		this.clusterGroup = new PruneClusterForLeaflet()

		this.clusterGroup.BuildLeafletCluster = (cluster, position)=>{
			const marker = new L.Marker(position, {
				icon: this.clusterGroup.BuildLeafletClusterIcon(cluster),
			})
		
			marker.on('click', ()=>{
				// Compute the cluster bounds (it's slow : O(n))
				const markersArea = this.clusterGroup.Cluster.FindMarkersInArea(cluster.bounds)
				const clusterBounds = this.clusterGroup.Cluster.ComputeBounds(markersArea)
		
				if (clusterBounds) {
					const bounds = new L.LatLngBounds(
						new L.LatLng(clusterBounds.minLat, clusterBounds.maxLng),
						new L.LatLng(clusterBounds.maxLat, clusterBounds.minLng)
					)
		
					const zoomLevelBefore = this.clusterGroup._map.getZoom()
					const zoomLevelAfter = this.clusterGroup._map.getBoundsZoom(bounds, false, new L.Point(20, 20, null))
		
					// If the zoom level doesn't change
					if (zoomLevelAfter === zoomLevelBefore) {
						// Send an event for the LeafletSpiderfier
						this.clusterGroup._map.fire('overlappingmarkers', {
							cluster: this.clusterGroup,
							markers: markersArea,
							center: marker.getLatLng(),
							marker: marker,
						})
		
						this.clusterGroup._map.flyTo(position, zoomLevelAfter, {
							animate: true,
							duration: 0.75,
						})
					}else{
						this.clusterGroup._map.flyToBounds(bounds, {
							animate: true,
							duration: 0.75,
							// padding: [100,100],
						})
					}
				}
			})
		
			return marker
		}

		this.clusterGroup.PrepareLeafletMarker = (leafletMarker, doc)=>{
			leafletMarker.setIcon(L.divIcon({
				html: `
					<div class="wrapper material-icons" style="--bg-color:${doc.___color.bg};--fg-color:${doc.___color.fg};">${doc.___preset.icon.toLowerCase() || ''}</div>
				`,
				className: 'marker-custom-icon',
				iconSize: L.point(40, 40, true),
			}))
		
			leafletMarker.bindTooltip(doc.name, {
				sticky: true,
				interactive: false,
				opacity: 1,
				permanent: false,
			})
	
			leafletMarker.on('click', ()=>this.showPlace(doc))
		}

		this.clusterGroup.BuildLeafletClusterIcon = cluster=>{
			const colors = Object.entries(cluster.GetClusterMarkers().map(m=>m.data.___color.bg).reduce((obj,preset_key)=>{
				if (!(!!obj[preset_key])) {
					obj[preset_key] = 0
				}
				obj[preset_key] += 1
				return obj
			},{})).sort((a,b)=>a[1]-b[1])
	
			const colors_sum = colors.reduce((sum,pair) => sum+pair[1], 0)
	
			const gradient = this.getConicGradient(colors.map(pair=>{
				return [pair[0] , pair[1]/colors_sum]
			}))
	
			return L.divIcon({
				html: `
					<div class="number">${cluster.population}</div>
					<div class="pieChart" style="background-image:url(${gradient.dataURL});"></div>
				`,
				className: 'marker-cluster-custom-icon',
				iconSize: L.point(48, 48, true),
			})
		}
		
		this.map.addLayer(this.clusterGroup)
	}
	addMarkersToPruneCluster(docs){
		this.clusterGroup.RemoveMarkers()

		for (const doc of docs) {
			this.clusterGroup.RegisterMarker(new PruneCluster.Marker(doc.lat, doc.lng, doc))
		}

		this.clusterGroup.ProcessView()
		this.map.invalidateSize(false)
	}

	// getMaxClusterRadius(zoomLevel){
	// 	if (zoomLevel<5) {
	// 		return 80
	// 	} else if (zoomLevel<6) {
	// 		return 120
	// 	}  else if (zoomLevel<9) {
	// 		return 100
	// 	} else if (zoomLevel<11) {
	// 		return 80
	// 	} else if (zoomLevel<16) {
	// 		return 60
	// 	} else if (zoomLevel<22) {
	// 		return 20
	// 	}
	//
	// 	return 80
	// }

	render() {
		// <ZoomControl position="bottomright" />

		return (<div className={this.props.className}>
			<Map
				ref={this.gotMapRef}
				className="map"

				preferCanvas={true}
				useFlyTo={true}
				bounds={this.state.bounds}
				center={[51,10]}
				minZoom={2}
				zoom={1}
				maxZoom={21}
				zoomControl={false}

				worldCopyJump={true}
				maxBoundsViscosity={1.0}

				maxBounds={[[-180,99999],[180,-99999]]}
			>
				{/*<TileLayer
					key="tilelayer"
					attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
					url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
				/>*/}
				{/*<TileLayer
					key="tilelayer"
					attribution='<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
					url="https://api.maptiler.com/maps/streets/256/{z}/{x}/{y}.png?key=JdjEr7nrztG6lZV91e7l"
				/>*/}

				{/*
					https://tiles3.mapillary.com/v0.1/{z}/{x}/{y}.mvt
					https://tiles3.mapillary.com/v0.1/{z}/{x}/{y}.png?client_id=czhaNGs0SExWRUVJeEZoaGptckZQdzpkYzc5MjE5NGZkNGY1ZmNi
					https://raster-tiles.mapillary.com/v0.1/{z}/{x}/{y}.png
				*/}

				{<TileLayer
					key="tilelayer"
					detectRetina={false}
					attribution='<a href="https://www.mapbox.com/about/maps/" target="_blank">&copy; MapBox</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
					    url="https://api.mapbox.com/styles/v1/petacat/ck7h7qgtg4c4b1ikiifin5it7/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoicGV0YWNhdCIsImEiOiJjaWl0MGpqOHEwM2VhdTZrbmhsNG96MjFrIn0.Uhlmj9xPIaPK_3fLUm4nIw"
					_no_url="https://api.mapbox.com/styles/v1/petacat/ck7h7qgtg4c4b1ikiifin5it7/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoicGV0YWNhdCIsImEiOiJjaWl0MGpqOHEwM2VhdTZrbmhsNG96MjFrIn0.Uhlmj9xPIaPK_3fLUm4nIw"
				/>}

				{/*<TileLayer
					key="tilelayer"
					attribution='mapillary.com'
					url="https://raster-tiles.mapillary.com/v0.1/{z}/{x}/{y}.png"
					maxZoom={17}
				/>*/}
				{/*
					url="https://api.mapbox.com/styles/v1/petacat/ck7h7qgtg4c4b1ikiifin5it7/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoicGV0YWNhdCIsImEiOiJjaWl0MGpqOHEwM2VhdTZrbmhsNG96MjFrIn0.Uhlmj9xPIaPK_3fLUm4nIw"
				*/}
				{/*<TileLayer
					key="tilelayer"
					attribution='href="https://www.mapbox.com/about/maps/" target="_blank">&copy; MapBox</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
					url="https://api.mapbox.com/styles/v1/petacat/cixrvkhut001a2rnts6cgmkn5/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoicGV0YWNhdCIsImEiOiJjaWl0MGpqOHEwM2VhdTZrbmhsNG96MjFrIn0.Uhlmj9xPIaPK_3fLUm4nIw"
				/>*/}
			</Map>
		</div>)
	}
}
