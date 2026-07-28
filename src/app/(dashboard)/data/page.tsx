import { IrrigationFieldsTable } from '@/components/data/IrrigationFieldsTable';


const data = () => {
  const selectedFarmId = "cmrzdal5y002pncbiaf53uihe";
  return (
    <div className="space-y-6"><IrrigationFieldsTable farmId={selectedFarmId}/></div>
  )
}

export default data