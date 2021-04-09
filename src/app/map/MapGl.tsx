import {useEffect, useRef, useState} from "react";
import 'mapbox-gl/dist/mapbox-gl.css';
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
// @ts-ignore
import mapboxgl from 'mapbox-gl/dist/mapbox-gl-csp';
// @ts-ignore
// eslint-disable-next-line import/no-webpack-loader-syntax
import MapboxWorker from 'worker-loader!mapbox-gl/dist/mapbox-gl-csp-worker';
import MapboxDraw, {DrawCreateEvent, DrawDeleteEvent, DrawUpdateEvent} from "@mapbox/mapbox-gl-draw";
import {Map} from 'mapbox-gl'
import {LineString} from "geojson";

mapboxgl.workerClass = MapboxWorker;
mapboxgl.accessToken = 'pk.eyJ1IjoieWFyb3NsYXZoZWxsbyIsImEiOiJja210MWw2dXgwajk1MnBwY3g3c2Vva3kwIn0.1Fi3lSfeaafJtaC_K4oCPw\n'

const getArrowFeature = (feature: GeoJSON.Feature<LineString>): GeoJSON.Feature => {
    const {geometry: {coordinates}, id} = feature
    const bulletCoords = [
        ...getArrowCoords(coordinates[coordinates.length - 1], coordinates[coordinates.length - 2]),
    ]
    return {
        id: Math.random(),
        type: "Feature" as const,
        geometry: {
            type: "Polygon" as const,
            coordinates: [bulletCoords],
        },
        properties: {connectedLineId: id}
    }
}

const initialFeaturesCol = {
    type: "FeatureCollection" as const,
    features: [
        {
            id: '86c049cb-6de6-4978-9549-853d82784bed',
            type: "Feature" as const,
            geometry: {
                type: "Polygon" as const,
                coordinates: [
                    [
                        [
                            -7.259007030152446,
                            52.79534982144216
                        ],
                        [
                            -0.2750222679437684,
                            55.76642282924644
                        ],
                        [
                            2.985358373598359,
                            53.89427672523263
                        ],
                        [
                            0.8117712792369502,
                            49.751071128837395
                        ],
                        [
                            -7.668781646302989,
                            50.237651119205424
                        ],
                        [
                            -7.259007030152446,
                            52.79534982144216
                        ]
                    ]
                ],

            },
            properties: {
                prop0: "value0"
            }
        }
    ]
}

const getArrowCoords = (endCoords: GeoJSON.Position, startCoords: GeoJSON.Position): GeoJSON.Position[] => {
    const [dx, dy] = [endCoords[0] - startCoords[0], endCoords[1] - startCoords[1]]
    const bulletAngle = 2 * (3.14 / 180);
    const bulletLenRatio = 0.9;
    const upX = startCoords[0] + bulletLenRatio * (dx * Math.cos(bulletAngle) - dy * Math.sin(bulletAngle));
    const upY = startCoords[1] + bulletLenRatio * (dy * Math.cos(bulletAngle) + dx * Math.sin(bulletAngle));
    const downX = startCoords[0] + bulletLenRatio * (dx * Math.cos(-bulletAngle) - dy * Math.sin(-bulletAngle));
    const downY = startCoords[1] + bulletLenRatio * (dy * Math.cos(-bulletAngle) + dx * Math.sin(-bulletAngle));
    return [
        [endCoords[0], endCoords[1]],
        [upX, upY],
        [downX, downY],
        [endCoords[0], endCoords[1]],
    ]
}

export const MapGL = () => {
    const mapContainer = useRef(null);
    const [draw, setDraw] = useState<MapboxDraw | null>(null)
    const [featuresCol, setFeaturesCol] = useState<GeoJSON.FeatureCollection>(initialFeaturesCol)
    useEffect(() => {
        const map: Map = new mapboxgl.Map({
            container: mapContainer.current,
            style: 'mapbox://styles/mapbox/streets-v11',
            center: [-7.259007030152446, 52.79534982144216],
            zoom: 4
        });
        const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: {
                line_string: true,
                polygon: true,
                trash: true
            }
        });
        map.addControl(draw, 'top-left');
        map.on('load', () => {
            draw.set(featuresCol)
            setDraw(draw)

            map.on('draw.create', function (e: DrawCreateEvent) {
                const {type} = e.features[0].geometry
                if (type === 'Polygon') {
                    setFeaturesCol((featuresCol) => {
                        return {...featuresCol, features: [...featuresCol.features, ...e.features]}
                    })
                }
                if (type === 'LineString') {
                    const bulletFeature = getArrowFeature(e.features[0] as GeoJSON.Feature<LineString>)
                    setFeaturesCol((featuresCol) => {
                        return {...featuresCol, features: [...featuresCol.features, ...e.features, bulletFeature]}
                    })
                }
            });
            map.on('draw.update', function (e: DrawUpdateEvent) {
                const updatedFeature = e.features[0];
                const {type} = e.features[0].geometry
                setFeaturesCol(featuresCol => {
                        const featureIndex = featuresCol.features.findIndex(
                            (feature) => feature.id === updatedFeature.id
                        )
                        let updatedFeatures = [...featuresCol.features]
                        updatedFeatures[featureIndex] = updatedFeature
                        if (type === 'LineString') {
                            updatedFeatures = updatedFeatures.filter(feature => feature.properties?.connectedLineId !== updatedFeatures[featureIndex].id)
                            const bulletFeature = getArrowFeature(e.features[0] as GeoJSON.Feature<LineString>)
                            updatedFeatures = [...updatedFeatures, bulletFeature]
                        }

                        return {
                            ...featuresCol,
                            features: updatedFeatures
                        }
                    }
                )
            });

            map.on('draw.delete', function (e: DrawDeleteEvent) {
                const {id: deletedFeatureId, geometry: {type}, properties} = e.features[0]
                debugger
                setFeaturesCol(featuresCol => {
                        return {
                            ...featuresCol,
                            features: featuresCol.features.filter(
                                (feature) =>
                                    feature.id !== deletedFeatureId
                                    && feature.id !== properties?.connectedLineId
                                    && feature.properties?.connectedLineId !== deletedFeatureId
                            )
                        }
                    }
                )
            });

        })
        return () => map.remove();
    }, []);

    useEffect(() => {
        draw && draw.set(featuresCol)
    }, [featuresCol, draw])

    return (
        <div className="map-container" ref={mapContainer}/>
    )
}

